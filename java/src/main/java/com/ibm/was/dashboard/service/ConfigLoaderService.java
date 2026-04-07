package com.ibm.was.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Loads config/environment.yml and resolves every key ending in "_env"
 * to the actual environment variable value.
 *
 * Config file resolution order:
 *   1. System property   -Dwas.dashboard.config=<path>
 *   2. Env variable       WAS_DASHBOARD_CONFIG=<path>
 *   3. Default            ./config/environment.yml  (working directory)
 *   4. Classpath fallback config/environment.yml
 */
@Service
public class ConfigLoaderService {

    private static final Logger log = LoggerFactory.getLogger(ConfigLoaderService.class);

    @Value("${was.dashboard.config:config/environment.yml}")
    private String configPath;

    private Map<String, Object> config;

    @PostConstruct
    public void load() {
        Yaml yaml = new Yaml();

        // Try filesystem path first
        Path path = Paths.get(configPath);
        InputStream in = null;

        if (Files.exists(path)) {
            try {
                in = Files.newInputStream(path);
                log.info("Loading config from filesystem: {}", path.toAbsolutePath());
            } catch (IOException e) {
                log.warn("Cannot open config file {}: {}", path, e.getMessage());
            }
        }

        // Classpath fallback
        if (in == null) {
            in = getClass().getClassLoader().getResourceAsStream(configPath);
            if (in != null) {
                log.info("Loading config from classpath: {}", configPath);
            }
        }

        if (in == null) {
            throw new IllegalStateException(
                "Cannot find configuration file: " + configPath +
                "\nSet WAS_DASHBOARD_CONFIG env variable or -Dwas.dashboard.config=<path>");
        }

        try (in) {
            @SuppressWarnings("unchecked")
            Map<String, Object> raw = yaml.load(in);
            this.config = resolveEnvVars(raw);
            log.info("Configuration loaded: {} top-level keys", config.size());
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load config", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> resolveEnvVars(Object obj) {
        if (obj instanceof Map map) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Object rawKey : map.keySet()) {
                String key = rawKey.toString();
                Object value = map.get(rawKey);
                if (key.endsWith("_env")) {
                    result.put(key, value);
                    String realKey = key.substring(0, key.length() - 4);
                    String envVal = System.getenv(value.toString());
                    if (envVal == null || envVal.isEmpty()) {
                        log.warn("Environment variable '{}' (for config key '{}') is not set.",
                                 value, realKey);
                        envVal = "";
                    }
                    result.put(realKey, envVal);
                } else {
                    result.put(key, resolveEnvVars(value));
                }
            }
            return result;
        } else if (obj instanceof List list) {
            List<Object> result = new ArrayList<>();
            for (Object item : list) result.add(resolveEnvVars(item));
            return (Map<String, Object>) (Object) result; // dummy cast bypass
        }
        return (Map<String, Object>) (Object) obj;
    }

    // ── Public accessors ─────────────────────────────────────────────

    public Map<String, Object> getConfig() { return config; }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getAppConfig() {
        return (Map<String, Object>) config.getOrDefault("app", Map.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getSites() {
        return (List<Map<String, Object>>) config.getOrDefault("sites", List.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getClusters() {
        return (List<Map<String, Object>>) config.getOrDefault("clusters", List.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getOdrServers() {
        return (List<Map<String, Object>>) config.getOrDefault("odr_servers", List.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getIisServers() {
        return (List<Map<String, Object>>) config.getOrDefault("iis_servers", List.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getContentPlatform() {
        return (List<Map<String, Object>>) config.getOrDefault("content_platform", List.of());
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getContentNavigator() {
        return (List<Map<String, Object>>) config.getOrDefault("content_navigator", List.of());
    }

    public boolean isSimulationMode() {
        return Boolean.TRUE.equals(getAppConfig().get("simulation_mode"));
    }

    public int getRefreshIntervalSeconds() {
        Object v = getAppConfig().get("refresh_interval");
        return (v instanceof Number n) ? n.intValue() : 30;
    }

    /** Returns config with passwords/keys redacted. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getSanitized() {
        return scrub(config);
    }

    private Object scrub(Object obj) {
        if (obj instanceof Map map) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Object k : map.keySet()) {
                String key = k.toString();
                Object val = map.get(k);
                boolean sensitive = !key.endsWith("_env") &&
                    (key.contains("password") || key.contains("key") ||
                     key.contains("secret")   || key.contains("token"));
                result.put(key, sensitive ? "***" : scrub(val));
            }
            return result;
        }
        if (obj instanceof List list) {
            List<Object> r = new ArrayList<>();
            for (Object i : list) r.add(scrub(i));
            return r;
        }
        return obj;
    }
}
