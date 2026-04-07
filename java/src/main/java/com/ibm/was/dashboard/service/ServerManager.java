package com.ibm.was.dashboard.service;

import com.ibm.was.dashboard.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

/**
 * Central service – builds the server inventory from config,
 * caches statuses, dispatches actions, and runs background polling.
 */
@Service
public class ServerManager {

    private static final Logger log = LoggerFactory.getLogger(ServerManager.class);
    private static final int MAX_LOG = 100;

    private final ConfigLoaderService cfg;
    private final WebSphereClient wasClient;
    private final IisClient iisClient;

    /** id → ServerInfo (live status cache) */
    private final Map<String, ServerInfo> servers = new ConcurrentHashMap<>();
    /** id → raw config map (used for SSH/WinRM) */
    private final Map<String, Map<String, Object>> rawConfigs = new ConcurrentHashMap<>();

    private final Deque<LogEntry> activityLog = new ConcurrentLinkedDeque<>();

    public ServerManager(ConfigLoaderService cfg,
                         WebSphereClient wasClient,
                         IisClient iisClient) {
        this.cfg = cfg;
        this.wasClient = wasClient;
        this.iisClient = iisClient;
    }

    @PostConstruct
    public void init() {
        buildInventory();
        log.info("Server inventory built: {} servers", servers.size());
        refreshAllStatuses();   // initial poll
    }

    // ── Inventory ────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void buildInventory() {
        Map<String, SiteInfo> siteMap = buildSiteMap();

        // WAS cluster members
        for (Map<String, Object> cluster : cfg.getClusters()) {
            String clusterName = str(cluster, "name");
            String siteId = str(cluster, "site_id");
            SiteInfo site = siteMap.getOrDefault(siteId, defaultSite(siteId));

            List<Map<String, Object>> members =
                (List<Map<String, Object>>) cluster.getOrDefault("members", List.of());
            for (Map<String, Object> member : members) {
                Map<String, Object> raw = new LinkedHashMap<>(cluster);
                raw.putAll(member);  // member overrides cluster-level
                String id = str(member, "id");
                ServerInfo info = buildServerInfo(id, raw, ServerType.WEBSPHERE, site);
                info.setClusterName(clusterName);
                info.setNodeName(str(member, "node_name"));
                info.setServerName(str(member, "server_name"));
                servers.put(id, info);
                rawConfigs.put(id, raw);
            }
        }

        // ODR
        for (Map<String, Object> s : cfg.getOdrServers()) {
            String id = str(s, "id");
            SiteInfo site = siteMap.getOrDefault(str(s, "site_id"), defaultSite(str(s, "site_id")));
            ServerInfo info = buildServerInfo(id, s, ServerType.ODR, site);
            info.setNodeName(str(s, "node_name"));
            info.setServerName(str(s, "server_name"));
            servers.put(id, info);
            rawConfigs.put(id, s);
        }

        // IIS
        for (Map<String, Object> s : cfg.getIisServers()) {
            String id = str(s, "id");
            SiteInfo site = siteMap.getOrDefault(str(s, "site_id"), defaultSite(str(s, "site_id")));
            ServerInfo info = buildServerInfo(id, s, ServerType.IIS, site);
            info.setHttpPort(80);
            info.setHttpsPort(443);
            servers.put(id, info);
            rawConfigs.put(id, s);
        }

        // CPE
        for (Map<String, Object> s : cfg.getContentPlatform()) {
            String id = str(s, "id");
            SiteInfo site = siteMap.getOrDefault(str(s, "site_id"), defaultSite(str(s, "site_id")));
            ServerInfo info = buildServerInfo(id, s, ServerType.CPE, site);
            info.setAdminUrl(str(s, "admin_url"));
            info.setNodeName(str(s, "node_name"));
            info.setServerName(str(s, "server_name"));
            servers.put(id, info);
            rawConfigs.put(id, s);
        }

        // ICN
        for (Map<String, Object> s : cfg.getContentNavigator()) {
            String id = str(s, "id");
            SiteInfo site = siteMap.getOrDefault(str(s, "site_id"), defaultSite(str(s, "site_id")));
            ServerInfo info = buildServerInfo(id, s, ServerType.ICN, site);
            info.setAdminUrl(str(s, "admin_url"));
            info.setNodeName(str(s, "node_name"));
            info.setServerName(str(s, "server_name"));
            servers.put(id, info);
            rawConfigs.put(id, s);
        }
    }

    private ServerInfo buildServerInfo(String id, Map<String, Object> raw,
                                       ServerType type, SiteInfo site) {
        ServerInfo info = new ServerInfo();
        info.setId(id);
        info.setName(raw.getOrDefault("name",
            raw.getOrDefault("server_name", id)).toString());
        info.setType(type);
        info.setHost(str(raw, "host"));
        info.setSiteId(site.getId());
        info.setSiteName(site.getName());
        info.setSiteColor(site.getColor());
        info.setIsPrimarySite(site.isIsPrimary());
        info.setHttpPort(intObj(raw, "http_port"));
        info.setHttpsPort(intObj(raw, "https_port"));
        return info;
    }

    private Map<String, SiteInfo> buildSiteMap() {
        Map<String, SiteInfo> map = new LinkedHashMap<>();
        for (Map<String, Object> s : cfg.getSites()) {
            SiteInfo si = new SiteInfo();
            si.setId(str(s, "id"));
            si.setName(str(s, "name"));
            si.setLocation(str(s, "location"));
            si.setColor(str(s, "color"));
            si.setIsPrimary(Boolean.TRUE.equals(s.get("is_primary")));
            map.put(si.getId(), si);
        }
        return map;
    }

    private SiteInfo defaultSite(String id) {
        SiteInfo s = new SiteInfo();
        s.setId(id); s.setName(id); s.setColor("#1e40af"); s.setIsPrimary(true);
        return s;
    }

    // ── Status polling ───────────────────────────────────────────────

    @Scheduled(fixedDelayString = "#{configLoaderService.refreshIntervalSeconds * 1000L}")
    public void scheduledRefresh() {
        refreshAllStatuses();
    }

    public void refreshAllStatuses() {
        ExecutorService pool = Executors.newCachedThreadPool();
        List<Future<?>> futures = servers.keySet().stream()
            .map(id -> pool.submit(() -> checkServerStatus(id)))
            .collect(Collectors.toList());
        futures.forEach(f -> { try { f.get(10, TimeUnit.SECONDS); } catch (Exception ignored) {} });
        pool.shutdown();
    }

    public Map<String, Object> checkServerStatus(String id) {
        ServerInfo info = servers.get(id);
        if (info == null) return Map.of("error", "Server not found: " + id);

        String[] result = cfg.isSimulationMode()
            ? simulateStatus(id)
            : fetchLiveStatus(id);

        info.setStatus(ServerStatus.valueOf(result[0].toUpperCase()));
        info.setMessage(result[1]);
        info.setLastChecked(Instant.now().toString());
        return Map.of("id", id, "status", result[0], "message", result[1],
                      "last_checked", info.getLastChecked());
    }

    private String[] fetchLiveStatus(String id) {
        ServerInfo info = servers.get(id);
        Map<String, Object> raw = rawConfigs.get(id);
        return (info.getType() == ServerType.IIS)
            ? iisClient.getStatus(raw)
            : wasClient.getStatus(raw);
    }

    private static final Random RND = new Random();
    private String[] simulateStatus(String id) {
        String status = RND.nextInt(3) == 0 ? "stopped" : "running";
        return new String[]{status, "[SIMULATION] " + status};
    }

    // ── Actions ──────────────────────────────────────────────────────

    public ActionResponse startServer(String id)   { return performAction(id, "start");   }
    public ActionResponse stopServer(String id)    { return performAction(id, "stop");    }
    public ActionResponse restartServer(String id) { return performAction(id, "restart"); }

    private ActionResponse performAction(String id, String action) {
        ServerInfo info = servers.get(id);
        if (info == null) {
            return new ActionResponse(false, "Server not found: " + id, id, action);
        }

        String[] result = cfg.isSimulationMode()
            ? new String[]{"ok", "[SIMULATION] " + action + " on " + info.getName()}
            : dispatchAction(id, action);

        boolean ok = "ok".equals(result[0]);

        // Optimistic status update
        if (ok) {
            info.setStatus(switch (action) {
                case "start", "restart" -> ServerStatus.RUNNING;
                case "stop"             -> ServerStatus.STOPPED;
                default                 -> ServerStatus.UNKNOWN;
            });
        }

        addLog(id, info.getName(), action, ok, result[1]);
        return new ActionResponse(ok, result[1], id, action);
    }

    private String[] dispatchAction(String id, String action) {
        ServerInfo info = servers.get(id);
        Map<String, Object> raw = rawConfigs.get(id);
        boolean isIis = info.getType() == ServerType.IIS;

        return switch (action) {
            case "start"   -> isIis ? iisClient.start(raw)   : wasClient.start(raw);
            case "stop"    -> isIis ? iisClient.stop(raw)    : wasClient.stop(raw);
            case "restart" -> isIis ? iisClient.restart(raw) : wasClient.restart(raw);
            default        -> new String[]{"error", "Unknown action: " + action};
        };
    }

    // ── Dashboard payload ────────────────────────────────────────────

    public DashboardStatus getDashboardStatus() {
        List<ServerInfo> all = new ArrayList<>(servers.values());

        long running = all.stream().filter(s -> s.getStatus() == ServerStatus.RUNNING).count();
        long stopped = all.stream().filter(s -> s.getStatus() == ServerStatus.STOPPED).count();
        long unknown = all.size() - running - stopped;

        // Site summaries
        List<SiteInfo> siteSummaries = cfg.getSites().stream().map(sc -> {
            String sid = str(sc, "id");
            List<ServerInfo> siteServers = all.stream()
                .filter(s -> sid.equals(s.getSiteId())).collect(Collectors.toList());
            SiteInfo si = new SiteInfo();
            si.setId(sid);
            si.setName(str(sc, "name"));
            si.setLocation(str(sc, "location"));
            si.setColor(str(sc, "color"));
            si.setIsPrimary(Boolean.TRUE.equals(sc.get("is_primary")));
            si.setServerCount(siteServers.size());
            si.setRunningCount((int) siteServers.stream()
                .filter(s -> s.getStatus() == ServerStatus.RUNNING).count());
            si.setStoppedCount((int) siteServers.stream()
                .filter(s -> s.getStatus() == ServerStatus.STOPPED).count());
            return si;
        }).collect(Collectors.toList());

        // Cluster groups
        List<Map<String, Object>> clusterGroups = cfg.getClusters().stream().map(cluster -> {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> members =
                (List<Map<String, Object>>) cluster.getOrDefault("members", List.of());
            List<Map<String, Object>> memberInfos = members.stream()
                .map(m -> str(m, "id"))
                .filter(servers::containsKey)
                .map(mid -> {
                    ServerInfo si = servers.get(mid);
                    return Map.<String,Object>of(
                        "id", si.getId(), "name", si.getName(),
                        "host", si.getHost(), "status", si.getStatus().lower(),
                        "type", si.getType().lower(), "site_id", si.getSiteId(),
                        "site_name", si.getSiteName(), "site_color", si.getSiteColor(),
                        "is_primary_site", si.isIsPrimarySite(),
                        "node_name", nvl(si.getNodeName()),
                        "server_name", nvl(si.getServerName()),
                        "cluster_name", nvl(si.getClusterName()),
                        "last_checked", nvl(si.getLastChecked()),
                        "message", nvl(si.getMessage()),
                        "http_port", si.getHttpPort() != null ? si.getHttpPort() : 0,
                        "https_port", si.getHttpsPort() != null ? si.getHttpsPort() : 0
                    );
                }).collect(Collectors.toList());
            return Map.<String,Object>of(
                "id", cluster.get("id"),
                "name", cluster.get("name"),
                "site_id", cluster.getOrDefault("site_id", ""),
                "members", memberInfos
            );
        }).collect(Collectors.toList());

        DashboardStatus ds = new DashboardStatus();
        ds.setSites(siteSummaries);
        ds.setClusters(clusterGroups);
        ds.setOdrServers(byType(all, ServerType.ODR));
        ds.setIisServers(byType(all, ServerType.IIS));
        ds.setContentPlatform(byType(all, ServerType.CPE));
        ds.setContentNavigator(byType(all, ServerType.ICN));
        ds.setTotalServers(all.size());
        ds.setRunningCount((int) running);
        ds.setStoppedCount((int) stopped);
        ds.setUnknownCount((int) unknown);
        ds.setLastRefresh(Instant.now().toString());
        return ds;
    }

    public List<ServerInfo> getAllServers() { return new ArrayList<>(servers.values()); }
    public List<LogEntry> getLogs()         { return new ArrayList<>(activityLog); }

    private List<ServerInfo> byType(List<ServerInfo> all, ServerType type) {
        return all.stream().filter(s -> s.getType() == type).collect(Collectors.toList());
    }

    // ── Activity Log ──────────────────────────────────────────────

    private void addLog(String sid, String name, String action, boolean ok, String msg) {
        activityLog.addFirst(new LogEntry(Instant.now().toString(), sid, name, action, ok, msg));
        while (activityLog.size() > MAX_LOG) activityLog.pollLast();
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static String str(Map<String, Object> m, String key) {
        Object v = m.get(key); return v == null ? "" : v.toString();
    }

    private static Integer intObj(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.intValue();
        if (v instanceof String s && !s.isEmpty()) {
            try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private static String nvl(String s) { return s != null ? s : ""; }
}
