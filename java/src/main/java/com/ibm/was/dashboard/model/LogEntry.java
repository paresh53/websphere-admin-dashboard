package com.ibm.was.dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LogEntry {
    private String timestamp;
    @JsonProperty("server_id")   private String serverId;
    @JsonProperty("server_name") private String serverName;
    private String action;
    private boolean success;
    private String message;
    private String user = "dashboard";

    public LogEntry() {}
    public LogEntry(String timestamp, String serverId, String serverName,
                    String action, boolean success, String message) {
        this.timestamp = timestamp; this.serverId = serverId;
        this.serverName = serverName; this.action = action;
        this.success = success; this.message = message;
    }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String ts) { this.timestamp = ts; }
    public String getServerId() { return serverId; }
    public void setServerId(String id) { this.serverId = id; }
    public String getServerName() { return serverName; }
    public void setServerName(String name) { this.serverName = name; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getUser() { return user; }
    public void setUser(String user) { this.user = user; }
}
