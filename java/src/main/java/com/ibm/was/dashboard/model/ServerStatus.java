package com.ibm.was.dashboard.model;

public enum ServerStatus {
    RUNNING, STOPPED, STARTING, STOPPING, UNKNOWN, ERROR;

    public String lower() { return name().toLowerCase(); }
}
