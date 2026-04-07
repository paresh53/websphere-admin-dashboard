package com.ibm.was.dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SiteInfo {
    private String id;
    private String name;
    private String location;
    @JsonProperty("is_primary") private boolean isPrimary;
    private String color;
    @JsonProperty("server_count")  private int serverCount;
    @JsonProperty("running_count") private int runningCount;
    @JsonProperty("stopped_count") private int stoppedCount;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public boolean isIsPrimary() { return isPrimary; }
    public void setIsPrimary(boolean isPrimary) { this.isPrimary = isPrimary; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public int getServerCount() { return serverCount; }
    public void setServerCount(int serverCount) { this.serverCount = serverCount; }
    public int getRunningCount() { return runningCount; }
    public void setRunningCount(int runningCount) { this.runningCount = runningCount; }
    public int getStoppedCount() { return stoppedCount; }
    public void setStoppedCount(int stoppedCount) { this.stoppedCount = stoppedCount; }
}
