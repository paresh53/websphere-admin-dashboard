# WebSphere Admin Dashboard

> A zero-code-change, web-based operations dashboard for IBM WebSphere clustered environments.
> One config file. Three distribution formats. Any user can start/stop servers with a single click.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

This tool gives every team member – DBA, developer, ops, or manager – a **single, secure web page**
to see and control the full IBM middleware stack:

| Layer | Technology |
|-------|-----------|
| Web Front-end | IIS (Windows Server, WinRM) |
| Routing / Proxy | On-Demand Routers (ODR) |
| Application Layer | IBM WebSphere AS (HA + DR clusters) |
| Content Management | IBM FileNet Content Platform Engine (CPE) |
| Content Navigation | IBM Content Navigator (ICN) |

**HA / DR aware** – primary and DR sites shown separately with coloured site tabs.
**Cluster-aware** – WAS cluster members grouped under their cluster.
**Simulation mode** – try the full UI without any real servers.

---

## Three Ways to Run – Pick One

| Mode | File | Runtime needed | Best for |
|------|------|---------------|---------|
| **Python APP** | `start.bat` | Python 3.8+ | Quick local run, dev |
| **Java JAR** | `start-jar.bat` | Java 17+ | Server deployment |
| **Java WAR** | Deploy to WebSphere/Tomcat | Java App Server | Enterprise deployment |
| **Standalone EXE** | `dist\was-dashboard\was-dashboard.exe` | Nothing | Air-gapped / zero-install |
| **Docker** | `docker-compose up` | Docker | Containerised |

---

## Project Layout

```
websphere-admin-dashboard/
├── config/
│   └── environment.yml        ← EDIT THIS – your servers & sites
├── backend/                   ← Python FastAPI backend
│   ├── main.py
│   ├── server_manager.py
│   ├── websphere_client.py    ← SSH → startServer / stopServer
│   ├── iis_client.py          ← WinRM → PowerShell IIS
│   ├── requirements.txt
│   └── .env.example
├── java/                      ← Spring Boot JAR/WAR backend
│   ├── pom.xml
│   └── src/main/java/com/ibm/was/dashboard/
│       ├── WasDashboardApplication.java
│       ├── controller/
│       ├── service/
│       └── model/
├── frontend/                  ← React + Vite + Tailwind CSS
│   └── src/components/
├── build-jar.bat              ← Build runnable JAR
├── build-war.bat              ← Build WAR for WebSphere/Tomcat
├── build-app.bat              ← Build Windows .exe (PyInstaller)
├── setup.bat                  ← One-time Python+Node setup
├── start.bat                  ← Run Python backend
├── start-jar.bat              ← Run Java JAR
└── docker-compose.yml
```

---

## Quick Start – 3 Steps

### Step 1 – Configure your environment

Open **`config/environment.yml`** and fill in your server details.
Minimum change – update hostnames and set `simulation_mode: true` to test first:

```yaml
app:
  simulation_mode: true    # set false once you have real servers

clusters:
  - id: "app_cluster_primary"
    members:
      - id: "was_app_p1"
        host: "was-app1.yourcompany.com"  # change this
        server_name: "AppServer1"
        node_name: "AppNode01"
        http_port: 9080

iis_servers:
  - id: "iis_p1"
    host: "iis1.yourcompany.com"          # change this
```

### Step 2 – Set passwords

```bat
copy backend\.env.example backend\.env
notepad backend\.env
```

### Step 3 – Run

**Python (no Java needed)**
```bat
setup.bat      # one-time install
start.bat      # opens http://localhost:8000
```

**Java JAR**
```bat
build-jar.bat
start-jar.bat
```

**Docker**
```bat
cd frontend && npm run build && cd ..
docker-compose up -d
```

---

## Build Artifacts

### JAR (Runnable fat JAR)

```bat
build-jar.bat
```

Output: `java\target\was-dashboard.jar` (~60 MB, needs Java 17+)

```bat
java -jar was-dashboard.jar

# Custom config path:
java -Dwas.dashboard.config="D:\config\environment.yml" -jar was-dashboard.jar

# Custom port:
java -DBACKEND_PORT=9000 -jar was-dashboard.jar
```

### WAR (WebSphere / Tomcat)

```bat
build-war.bat
```

Output: `java\target\was-dashboard.war`

**WebSphere:**
1. Admin Console → Applications → New Application → New Enterprise Application
2. Upload `was-dashboard.war`
3. Set context root to `/`
4. Add JVM property: `was.dashboard.config` = `/opt/config/environment.yml`
5. Save and start

**Tomcat:**
```bash
cp java/target/was-dashboard.war $TOMCAT_HOME/webapps/ROOT.war
# In setenv.sh: JAVA_OPTS="-Dwas.dashboard.config=/opt/config/environment.yml"
```

### Standalone EXE (Windows, nothing extra needed)

```bat
build-app.bat
```

Output: `dist\was-dashboard\was-dashboard.exe`

Distribute the entire `dist\was-dashboard\` folder. Edit `config\environment.yml`
inside it – no Java, no Python required on target machines.

---

## Configuration Reference (`config/environment.yml`)

### App settings

```yaml
app:
  name: "WebSphere Admin Dashboard"
  refresh_interval: 30       # auto-refresh in seconds
  backend_port: 8000
  simulation_mode: false     # true = fake status (no SSH/WinRM)
  auth_enabled: false        # true = HTTP Basic Auth on the UI
```

### Sites (HA / DR)

```yaml
sites:
  - id: "primary"
    name: "Primary Site"
    location: "DC1 – New York"
    is_primary: true
    color: "#1e40af"
  - id: "dr"
    name: "DR Site"
    location: "DC2 – Chicago"
    is_primary: false
    color: "#7c3aed"
```

### Adding a new server

Copy any existing entry with a new unique `id` and `host`. Restart the backend – no code changes needed.

### Credential keys (use env vars, never plain text)

| Config field | Env var | Purpose |
|---|---|---|
| `admin_password_env: "DMGR_PASSWORD"` | `DMGR_PASSWORD` | WAS admin password |
| `ssh_key_env: "WAS_SSH_KEY_PATH"` | `WAS_SSH_KEY_PATH` | SSH private key path |
| `winrm_password_env: "IIS1_PASSWORD"` | `IIS1_PASSWORD` | IIS WinRM password |

---

## API Reference

Both Python and Java backends expose identical REST endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Full dashboard payload |
| GET | `/api/servers` | All servers list |
| POST | `/api/servers/{id}/start` | Start server |
| POST | `/api/servers/{id}/stop` | Stop server |
| POST | `/api/servers/{id}/restart` | Restart server |
| GET | `/api/servers/{id}/status` | Refresh one server |
| POST | `/api/refresh` | Refresh all |
| GET | `/api/logs` | Activity log |
| GET | `/api/config` | Sanitised config |
| GET | `/health` | Health check |

Swagger UI (Python): http://localhost:8000/docs

---

## SSH Setup

```bash
ssh-keygen -t ed25519 -f ~/.ssh/was_dashboard -N ""
ssh-copy-id -i ~/.ssh/was_dashboard.pub wasadmin@was-app1.company.com
```

Set `WAS_SSH_KEY_PATH=C:/Users/you/.ssh/was_dashboard` in `backend/.env`.

## IIS / WinRM Setup

Run once on each IIS server (as Administrator):
```powershell
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "dashboard-host"
```

---

## Security

- Credentials via environment variables only – never in YAML
- `GET /api/config` redacts passwords as `***`
- Enable `auth_enabled: true` for Basic Auth protection
- For production: place behind corporate SSO / VPN

---

## License

MIT – free to use, modify, and distribute.
