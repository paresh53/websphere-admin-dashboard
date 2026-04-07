package com.ibm.was.dashboard.service;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.NTCredentials;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClientBuilder;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactoryBuilder;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;

/**
 * IIS management via WinRM PowerShell over HTTP/NTLM.
 * Falls back to TCP port check if WinRM is unavailable.
 */
@Component
public class IisClient {

    private static final Logger log = LoggerFactory.getLogger(IisClient.class);

    // ── Status ────────────────────────────────────────────────────

    public String[] getStatus(Map<String, Object> server) {
        String host = str(server, "host");
        if (host.isEmpty()) return new String[]{"unknown", "No host configured"};

        try {
            String output = runPowerShell(server,
                "Import-Module WebAdministration -ErrorAction SilentlyContinue;" +
                "Get-Website | ForEach-Object { \"$($_.Name)=$($_.State)\" }");

            if (output.contains("Started")) return new String[]{"running", "IIS: " + truncate(output, 200)};
            if (output.contains("Stopped")) return new String[]{"stopped", "IIS: " + truncate(output, 200)};
            return new String[]{"unknown", "IIS state: " + truncate(output, 200)};

        } catch (Exception e) {
            log.debug("WinRM status failed for {}: {} – falling back to TCP", host, e.getMessage());
            if (WebSphereClient.portOpen(host, 80) || WebSphereClient.portOpen(host, 443)) {
                return new String[]{"running", "WinRM unavailable; TCP port open"};
            }
            return new String[]{"unknown", "WinRM error: " + e.getMessage()};
        }
    }

    // ── Actions ───────────────────────────────────────────────────

    public String[] start(Map<String, Object> server) {
        return iisAction(server, "start");
    }

    public String[] stop(Map<String, Object> server) {
        return iisAction(server, "stop");
    }

    public String[] restart(Map<String, Object> server) {
        try {
            String out = runPowerShell(server, "iisreset /restart");
            return new String[]{"ok", "IIS restarted: " + truncate(out, 200)};
        } catch (Exception e) {
            return new String[]{"error", "IIS restart failed: " + e.getMessage()};
        }
    }

    @SuppressWarnings("unchecked")
    private String[] iisAction(Map<String, Object> server, String verb) {
        List<Map<String, Object>> sites =
            (List<Map<String, Object>>) server.getOrDefault("iis_sites", List.of());

        StringBuilder ps = new StringBuilder(
            "Import-Module WebAdministration -ErrorAction SilentlyContinue;\n");

        String cmd = verb.equals("start") ? "Start" : "Stop";
        for (Map<String, Object> site : sites) {
            String siteName = str(site, "name");
            ps.append(cmd).append("-WebSite -Name \"").append(siteName)
              .append("\" -ErrorAction SilentlyContinue;\n");

            List<String> pools = (List<String>) site.getOrDefault("app_pools", List.of());
            for (String pool : pools) {
                ps.append(cmd).append("-WebAppPool -Name \"").append(pool)
                  .append("\" -ErrorAction SilentlyContinue;\n");
            }
        }
        ps.append("Write-Output 'Done'");

        try {
            String out = runPowerShell(server, ps.toString());
            return new String[]{"ok", "IIS " + verb + " complete: " + truncate(out, 100)};
        } catch (Exception e) {
            return new String[]{"error", "IIS " + verb + " failed: " + e.getMessage()};
        }
    }

    // ── WinRM SOAP over HTTP with NTLM ─────────────────────────────

    private String runPowerShell(Map<String, Object> server, String script) throws Exception {
        String host     = str(server, "host");
        int    port     = intVal(server, "winrm_port", 5985);
        boolean useSsl  = Boolean.TRUE.equals(server.get("winrm_use_ssl"));
        String username = str(server, "winrm_username");
        String password = str(server, "winrm_password");
        String scheme   = useSsl ? "https" : "http";
        String endpoint = scheme + "://" + host + ":" + port + "/wsman";

        // Build encoded PowerShell command
        String encoded = java.util.Base64.getEncoder()
            .encodeToString(script.getBytes(java.nio.charset.StandardCharsets.UTF_16LE));

        String soapBody = buildWinRMSoapEnvelope("powershell -EncodedCommand " + encoded);

        BasicCredentialsProvider creds = new BasicCredentialsProvider();
        // Split domain\user
        String domain = "", user = username;
        if (username.contains("\\")) {
            domain = username.substring(0, username.indexOf('\\'));
            user   = username.substring(username.indexOf('\\') + 1);
        }
        creds.setCredentials(new AuthScope(host, port),
            new NTCredentials(user, password.toCharArray(), host, domain));

        try (CloseableHttpClient client = buildHttpClient(creds, useSsl)) {
            HttpPost post = new HttpPost(endpoint);
            post.setHeader("Content-Type", "application/soap+xml;charset=UTF-8");
            post.setHeader("WSMANIDENTIFY", "unauthenticated");
            post.setEntity(new StringEntity(soapBody, ContentType.create("application/soap+xml", "UTF-8")));

            return client.execute(post, response -> {
                String body = EntityUtils.toString(response.getEntity());
                if (response.getCode() >= 400) {
                    throw new RuntimeException("WinRM HTTP " + response.getCode() + ": " + truncate(body, 200));
                }
                return extractWinRMOutput(body);
            });
        }
    }

    private CloseableHttpClient buildHttpClient(BasicCredentialsProvider creds, boolean useSsl) throws Exception {
        if (useSsl) {
            SSLContext sslCtx = SSLContext.getInstance("TLS");
            sslCtx.init(null, new TrustManager[]{new X509TrustManager() {
                public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                public void checkClientTrusted(X509Certificate[] c, String a) {}
                public void checkServerTrusted(X509Certificate[] c, String a) {}
            }}, null);

            var cm = PoolingHttpClientConnectionManagerBuilder.create()
                .setSSLSocketFactory(SSLConnectionSocketFactoryBuilder.create()
                    .setSslContext(sslCtx).setHostnameVerifier(NoopHostnameVerifier.INSTANCE).build())
                .build();

            return HttpClientBuilder.create()
                .setDefaultCredentialsProvider(creds)
                .setConnectionManager(cm).build();
        }
        return HttpClientBuilder.create()
            .setDefaultCredentialsProvider(creds).build();
    }

    private String buildWinRMSoapEnvelope(String command) {
        return """
            <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
                        xmlns:wsmid="http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd"
                        xmlns:wsman="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"
                        xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
                        xmlns:rsp="http://schemas.microsoft.com/wbem/wsman/1/windows/shell">
              <s:Header>
                <wsman:ResourceURI>http://schemas.microsoft.com/wbem/wsman/1/windows/shell/cmd</wsman:ResourceURI>
                <wsa:Action>http://schemas.xmlsoap.org/ws/2004/09/transfer/Create</wsa:Action>
              </s:Header>
              <s:Body>
                <rsp:Shell><rsp:Command>""" + escapeXml(command) + """
                </rsp:Command></rsp:Shell>
              </s:Body>
            </s:Envelope>""";
    }

    private String extractWinRMOutput(String soap) {
        // Very lightweight extraction – avoids pulling in a full XML parser
        int start = soap.indexOf("<rsp:Stream");
        if (start < 0) return soap;
        int end   = soap.lastIndexOf("</rsp:Stream>") + "</rsp:Stream>".length();
        String raw = soap.substring(start, Math.min(end, soap.length()));
        // Strip XML tags
        return raw.replaceAll("<[^>]+>", "").trim();
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key); return v == null ? "" : v.toString();
    }

    private static int intVal(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s) { try { return Integer.parseInt(s); } catch (Exception ignored) {} }
        return def;
    }

    private static String escapeXml(String s) {
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                .replace("\"","&quot;").replace("'","&apos;");
    }

    private static String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) + "…" : (s == null ? "" : s);
    }
}
