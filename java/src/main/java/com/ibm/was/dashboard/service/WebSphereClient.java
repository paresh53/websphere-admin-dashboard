package com.ibm.was.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.Map;

/**
 * Manages WebSphere / ODR / CPE / ICN servers via SSH.
 *
 * Uses JSch to SSH into the node and run:
 *   $WAS_HOME/profiles/$PROFILE/bin/startServer.sh  $SERVER_NAME
 *   $WAS_HOME/profiles/$PROFILE/bin/stopServer.sh   $SERVER_NAME
 *
 * Status is determined by TCP port probe (no special WAS API needed).
 */
@Component
public class WebSphereClient {

    private static final Logger log = LoggerFactory.getLogger(WebSphereClient.class);
    private static final int TCP_TIMEOUT_MS = 5_000;

    // ── Status ──────────────────────────────────────────────────────

    /**
     * Returns ["running"|"stopped"|"unknown", message].
     */
    public String[] getStatus(Map<String, Object> server) {
        String host = str(server, "host");
        if (host.isEmpty()) return new String[]{"unknown", "No host configured"};

        Integer httpPort  = intVal(server, "http_port");
        Integer httpsPort = intVal(server, "https_port");

        for (Integer port : new Integer[]{httpPort, httpsPort}) {
            if (port != null && portOpen(host, port)) {
                return new String[]{"running", "Port " + port + " open on " + host};
            }
        }

        if (httpPort == null && httpsPort == null) {
            return new String[]{"unknown", "No ports configured"};
        }
        return new String[]{"stopped", "No open port found on " + host};
    }

    public static boolean portOpen(String host, int port) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), TCP_TIMEOUT_MS);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // ── SSH actions ──────────────────────────────────────────────────

    public String[] start(Map<String, Object> server) {
        return sshAction(server, "startServer");
    }

    public String[] stop(Map<String, Object> server) {
        return sshAction(server, "stopServer");
    }

    public String[] restart(Map<String, Object> server) {
        String[] result = stop(server);
        if (!result[0].equals("ok")) return result;
        return start(server);
    }

    private String[] sshAction(Map<String, Object> server, String script) {
        String serverName = str(server, "server_name");
        if (serverName.isEmpty()) return new String[]{"error", "server_name not configured"};

        String wasHome  = str(server, "was_home");
        String profile  = str(server, "profile_name");
        String adminUser = str(server, "admin_username");
        String adminPass = str(server, "admin_password");

        String cmd = wasHome + "/profiles/" + profile + "/bin/" + script + ".sh " + serverName;
        if (script.equals("stopServer") && !adminPass.isEmpty()) {
            cmd += " -username " + adminUser + " -password " + adminPass;
        }

        try {
            String output = execSsh(server, cmd, 180);
            boolean ok = output.contains("ADMU3000I") || output.contains("ADMU4000I")
                      || output.contains("open for e-business")
                      || output.contains("stop completed");
            if (!ok && !output.contains("error") && !output.contains("Error")) ok = true;
            return new String[]{ok ? "ok" : "error",
                                (ok ? script + " succeeded: " : script + " failed: ") + truncate(output, 300)};
        } catch (Exception e) {
            log.error("SSH {} failed for {}: {}", script, server.get("host"), e.getMessage());
            return new String[]{"error", "SSH error: " + e.getMessage()};
        }
    }

    // ── JSch SSH execution ─────────────────────────────────────────

    private String execSsh(Map<String, Object> server, String command, int timeoutSec) throws Exception {
        try {
            Class.forName("com.jcraft.jsch.JSch");
        } catch (ClassNotFoundException e) {
            return "[SIMULATION] JSch not available. Command would be: " + command;
        }

        com.jcraft.jsch.JSch jsch = new com.jcraft.jsch.JSch();

        String sshUser    = str(server, "ssh_username");
        String sshKeyPath = str(server, "ssh_key");
        String sshPass    = str(server, "ssh_password");
        String host       = str(server, "host");

        if (!sshKeyPath.isEmpty()) {
            jsch.addIdentity(sshKeyPath);
        }

        com.jcraft.jsch.Session session = jsch.getSession(sshUser, host, 22);
        session.setConfig("StrictHostKeyChecking", "no");
        if (!sshPass.isEmpty()) session.setPassword(sshPass);
        session.setTimeout(timeoutSec * 1000);
        session.connect(timeoutSec * 1000);

        try {
            com.jcraft.jsch.ChannelExec channel =
                (com.jcraft.jsch.ChannelExec) session.openChannel("exec");
            channel.setCommand(command);

            InputStream stdout = channel.getInputStream();
            InputStream stderr = channel.getErrStream();
            channel.connect();

            StringBuilder sb = new StringBuilder();
            byte[] buf = new byte[4096];
            int n;
            while ((n = stdout.read(buf)) != -1)  sb.append(new String(buf, 0, n));
            while ((n = stderr.read(buf))  != -1) sb.append(new String(buf, 0, n));

            channel.disconnect();
            return sb.toString();
        } finally {
            session.disconnect();
        }
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v == null ? "" : v.toString();
    }

    private static Integer intVal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s && !s.isEmpty()) {
            try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) + "…" : s;
    }
}
