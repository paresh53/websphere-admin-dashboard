package com.ibm.was.dashboard.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ServerInfo {

    private String id;
    private String name;
    private ServerType type;
    private String host;

    @JsonProperty("site_id")
    private String siteId;

    @JsonProperty("site_name")
    private String siteName;

    @JsonProperty("site_color")
    private String siteColor = "#1e40af";

    @JsonProperty("is_primary_site")
    private boolean isPrimarySite;

    private ServerStatus status = ServerStatus.UNKNOWN;

    @JsonProperty("http_port")
    private Integer httpPort;

    @JsonProperty("https_port")
    private Integer httpsPort;

    @JsonProperty("admin_url")
    private String adminUrl;

    @JsonProperty("node_name")
    private String nodeName;

    @JsonProperty("server_name")
    private String serverName;

    @JsonProperty("cluster_name")
    private String clusterName;

    @JsonProperty("last_checked")
    private String lastChecked;

    private String message;

    // ── Getters & Setters ──────────────────────────────────────────

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public ServerType getType() { return type; }
    public void setType(ServerType type) { this.type = type; }

    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }

    public String getSiteId() { return siteId; }
    public void setSiteId(String siteId) { this.siteId = siteId; }

    public String getSiteName() { return siteName; }
    public void setSiteName(String siteName) { this.siteName = siteName; }

    public String getSiteColor() { return siteColor; }
    public void setSiteColor(String siteColor) { this.siteColor = siteColor; }

    public boolean isIsPrimarySite() { return isPrimarySite; }
    public void setIsPrimarySite(boolean isPrimarySite) { this.isPrimarySite = isPrimarySite; }

    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }

    public Integer getHttpPort() { return httpPort; }
    public void setHttpPort(Integer httpPort) { this.httpPort = httpPort; }

    public Integer getHttpsPort() { return httpsPort; }
    public void setHttpsPort(Integer httpsPort) { this.httpsPort = httpsPort; }

    public String getAdminUrl() { return adminUrl; }
    public void setAdminUrl(String adminUrl) { this.adminUrl = adminUrl; }

    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }

    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }

    public String getClusterName() { return clusterName; }
    public void setClusterName(String clusterName) { this.clusterName = clusterName; }

    public String getLastChecked() { return lastChecked; }
    public void setLastChecked(String lastChecked) { this.lastChecked = lastChecked; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
