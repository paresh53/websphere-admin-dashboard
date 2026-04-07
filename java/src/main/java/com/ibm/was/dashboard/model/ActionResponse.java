package com.ibm.was.dashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ActionResponse {
    private boolean success;
    private String message;
    @JsonProperty("server_id") private String serverId;
    private String action;

    public ActionResponse() {}
    public ActionResponse(boolean success, String message, String serverId, String action) {
        this.success = success; this.message = message;
        this.serverId = serverId; this.action = action;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getServerId() { return serverId; }
    public void setServerId(String serverId) { this.serverId = serverId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}
