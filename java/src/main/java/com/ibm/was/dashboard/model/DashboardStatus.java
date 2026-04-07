package com.ibm.was.dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class DashboardStatus {
    private List<SiteInfo> sites;
    private List<Map<String, Object>> clusters;
    @JsonProperty("odr_servers")      private List<ServerInfo> odrServers;
    @JsonProperty("iis_servers")      private List<ServerInfo> iisServers;
    @JsonProperty("content_platform") private List<ServerInfo> contentPlatform;
    @JsonProperty("content_navigator") private List<ServerInfo> contentNavigator;
    @JsonProperty("total_servers")    private int totalServers;
    @JsonProperty("running_count")    private int runningCount;
    @JsonProperty("stopped_count")    private int stoppedCount;
    @JsonProperty("unknown_count")    private int unknownCount;
    @JsonProperty("last_refresh")     private String lastRefresh;

    public List<SiteInfo> getSites() { return sites; }
    public void setSites(List<SiteInfo> sites) { this.sites = sites; }
    public List<Map<String, Object>> getClusters() { return clusters; }
    public void setClusters(List<Map<String, Object>> clusters) { this.clusters = clusters; }
    public List<ServerInfo> getOdrServers() { return odrServers; }
    public void setOdrServers(List<ServerInfo> odrServers) { this.odrServers = odrServers; }
    public List<ServerInfo> getIisServers() { return iisServers; }
    public void setIisServers(List<ServerInfo> iisServers) { this.iisServers = iisServers; }
    public List<ServerInfo> getContentPlatform() { return contentPlatform; }
    public void setContentPlatform(List<ServerInfo> contentPlatform) { this.contentPlatform = contentPlatform; }
    public List<ServerInfo> getContentNavigator() { return contentNavigator; }
    public void setContentNavigator(List<ServerInfo> contentNavigator) { this.contentNavigator = contentNavigator; }
    public int getTotalServers() { return totalServers; }
    public void setTotalServers(int totalServers) { this.totalServers = totalServers; }
    public int getRunningCount() { return runningCount; }
    public void setRunningCount(int runningCount) { this.runningCount = runningCount; }
    public int getStoppedCount() { return stoppedCount; }
    public void setStoppedCount(int stoppedCount) { this.stoppedCount = stoppedCount; }
    public int getUnknownCount() { return unknownCount; }
    public void setUnknownCount(int unknownCount) { this.unknownCount = unknownCount; }
    public String getLastRefresh() { return lastRefresh; }
    public void setLastRefresh(String lastRefresh) { this.lastRefresh = lastRefresh; }
}
