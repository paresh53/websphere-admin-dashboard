package com.ibm.was.dashboard.controller;

import com.ibm.was.dashboard.model.*;
import com.ibm.was.dashboard.service.ConfigLoaderService;
import com.ibm.was.dashboard.service.ServerManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * REST API – mirrors the Python FastAPI endpoints exactly so the
 * React frontend works with both backends without changes.
 */
@RestController
@RequestMapping("/api")
public class DashboardController {

    private final ServerManager manager;
    private final ConfigLoaderService cfg;

    public DashboardController(ServerManager manager, ConfigLoaderService cfg) {
        this.manager = manager;
        this.cfg = cfg;
    }

    // ── Dashboard ─────────────────────────────────────────────────

    @GetMapping("/status")
    public DashboardStatus getStatus() {
        return manager.getDashboardStatus();
    }

    @GetMapping("/servers")
    public List<ServerInfo> listServers() {
        return manager.getAllServers();
    }

    @PostMapping("/refresh")
    public Map<String, Object> refresh() {
        manager.refreshAllStatuses();
        return Map.of("message", "Refresh complete",
                      "total", manager.getAllServers().size());
    }

    // ── Per-server actions ────────────────────────────────────────

    @PostMapping("/servers/{id}/start")
    public ActionResponse start(@PathVariable String id) {
        return manager.startServer(id);
    }

    @PostMapping("/servers/{id}/stop")
    public ActionResponse stop(@PathVariable String id) {
        return manager.stopServer(id);
    }

    @PostMapping("/servers/{id}/restart")
    public ActionResponse restart(@PathVariable String id) {
        return manager.restartServer(id);
    }

    @GetMapping("/servers/{id}/status")
    public Map<String, Object> serverStatus(@PathVariable String id) {
        return manager.checkServerStatus(id);
    }

    // ── Logs & Config ─────────────────────────────────────────────

    @GetMapping("/logs")
    public List<LogEntry> getLogs() {
        return manager.getLogs();
    }

    @GetMapping("/config")
    public Map<String, Object> getConfig() {
        return cfg.getSanitized();
    }

    // ── Health ────────────────────────────────────────────────────

    @GetMapping("/health")   // also exposed at /health via Spring Actuator
    public Map<String, Object> health() {
        return Map.of("status", "ok", "timestamp", Instant.now().toString());
    }
}
