package com.ibm.was.dashboard.model;

public enum ServerType {
    WEBSPHERE, ODR, IIS, CPE, ICN;

    public String lower() { return name().toLowerCase(); }
}
