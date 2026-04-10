# WebSphere Admin Dashboard - Configuration Guide

## 📋 Single Configuration File Location

All server and application configuration is managed in ONE file:

```
config/environment.yml
```

This is the ONLY file you need to edit to:
- Add new servers (WAS, ODR, IIS, CPE, ICN)
- Change sites and locations  
- Configure DMGR connection
- Set deployment preferences

---

## 🔧 Quick Setup

### 1. Basic App Settings
```yaml
app:
  name: WebSphere Admin Dashboard
  refresh_interval: 30        # seconds between status updates
  simulation_mode: true       # Set to false for real servers
  backend_port: 8000
  auth_enabled: false         # Enable if you need login
```

### 2. Add Sites
```yaml
sites:
- id: primary
  name: Primary Site
  location: DC1 – New York
  is_primary: true
  color: '#1e40af'           # Any hex color

- id: dr  
  name: DR Site
  location: DC2 – Chicago
  is_primary: false
  color: '#7c3aed'
```

### 3. Configure Deployment Manager (DMGR)
```yaml
deployment_manager:
  host: dmgr-server           # Hostname or IP
  admin_username: wsadmin     # WAS admin user
  admin_password_env: DMGR_PASSWORD  # Set env var before running
  was_home: /opt/IBM/WebSphere/AppServer
```

### 4. Add WebSphere Servers

#### Option A: Add to Existing Cluster
```yaml
clusters:
- id: app_cluster
  name: AppCluster01
  site_id: primary            # Links to site defined above
  members:
  - id: was_p01
    name: WAS-P01
    server_name: AppServer01
    node_name: AppNode01
    host: was-p01.example.com # Hostname/IP
    http_port: 9080
    https_port: 9443
    user_added: true          # Marks as "real" server
```

#### Option B: Add as New ODR Server
```yaml
odr_servers:
- id: odr_primary
  name: Primary ODR
  host: odr-p01.example.com
  http_port: 9080
  https_port: 9443
  site_id: primary
  user_added: true
```

### 5. Add IIS Servers
```yaml
iis_servers:
- id: iis_web01
  name: IIS Web01
  host: iis-web01.example.com
  site_id: primary
  winrm_port: 5985
  winrm_username: DOMAIN\iisadmin
  winrm_password_env: IIS_PASSWORD  # Set env var before running
  iis_sites:
    - name: "Default Web Site"
      app_pools: ["DefaultAppPool"]
  user_added: true
```

### 6. Add CPE (Content Platform Engine)
```yaml
content_platform:
- id: cpe_primary
  name: Primary CPE
  host: cpe-server.example.com
  http_port: 8080
  admin_url: http://cpe-server.example.com:8080/acce
  site_id: primary
  user_added: true
```

### 7. Add ICN (IBM Content Navigator)
```yaml
content_navigator:
- id: icn_primary
  name: ICN Server
  host: icn-server.example.com
  http_port: 8080
  admin_url: http://icn-server.example.com:8080/navigator
  site_id: primary
  user_added: true
```

---

## 🔐 Environment Variables (Credentials)

Set these BEFORE running the dashboard:

```bash
# Linux/Mac
export DMGR_PASSWORD="your_wsadmin_password"
export WAS_SSH_KEY_PATH="/home/user/.ssh/was_key"
export IIS_PASSWORD="DOMAIN\iisadmin_password"

# Windows (PowerShell)
$env:DMGR_PASSWORD="your_wsadmin_password"
$env:WAS_SSH_KEY_PATH="C:\Users\user\.ssh\was_key"
$env:IIS_PASSWORD="DOMAIN\iisadmin_password"
```

**Never put passwords directly in environment.yml!**

---

## 🚀 Switching from Simulation to Production

1. **Edit `config/environment.yml`:**
   ```yaml
   app:
     simulation_mode: false   # Turn OFF simulation
   ```

2. **Set all required environment variables:** (see section above)

3. **Mark servers as real:**
   ```yaml
   servers:
   - id: was_p01
     user_added: true        # MUST be true for real servers
   ```

4. **Test connection** - Add a new test server through UI
   - If it works, you're ready!
   - If it fails, check environment variables and credentials

---

## 📝 File Format

The `config/environment.yml` file uses YAML format. Indentation matters!

### Valid Example:
```yaml
app:
  simulation_mode: true
  refresh_interval: 30
sites:
- id: primary
  name: Primary Site
```

### Invalid Examples:
```yaml
# ❌ Wrong indentation
app:
  simulation_mode: true
refresh_interval: 30    # Should be indented under app!

# ❌ Missing colon
sites
- id: primary

# ❌ Invalid spacing
app :simulation_mode: true  # Extra space before colon
```

Use a YAML validator: https://www.yamllint.com/

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| "Server not found" | Check `user_added: true` in YAML |
| "SSH error" | Verify `WAS_SSH_KEY_PATH` env var is set and file exists |
| "Cannot reach backend" | Ensure Python backend is running on port 8000 |
| "IIS connection failed" | Check WinRM is enabled and credentials are correct |
| "YAML parse error" | Validate YAML at https://www.yamllint.com/ |

---

## 📂 Integration with Other Tools

From your terminal:
```bash
# View current configuration (passwords hidden)
curl http://localhost:8000/api/config | jq

# Add server via API
curl -X POST http://localhost:8000/api/servers/add \
  -H "Content-Type: application/json" \
  -d '{"id":"test_srv","name":"Test","type":"websphere","host":"test.com","site_id":"primary"}'

# Get all server statuses  
curl http://localhost:8000/api/status | jq '.servers'
```

---

## 📖 Complete Example Configuration

See `config/environment.yml` for a full working example that includes:
- Multiple sites (Primary + DR)
- WAS clusters with members
- ODR servers
- IIS servers configured for WinRM
- CPE and ICN servers
- Deployment Manager settings
