# WebSphere Admin Dashboard

> A zero-code-change, web-based operations dashboard for IBM WebSphere clustered environments with HA/DR support.
> One config file. Three distribution formats. Any user can monitor and control servers with a single click.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🚀 Quick Start for Business Users

**👉 [Configuration Guide](CONFIG_GUIDE.md)** - How to set up servers (business users start here)  
**👉 [Deployment Guide](DEPLOYMENT_GUIDE.md)** - How to build and deploy  


### Three Deployment Options:

| Option | Best For | Setup Time | Deployment |
|--------|----------|-----------|-----------|
| **Windows EXE** | Quick setup, single file | 5 minutes | `BUILD_EXE.bat` → run `.exe` |
| **Java WAR** | Enterprise, WebSphere/Tomcat | 10 minutes | `BUILD_WAR.bat` → deploy to app server |
| **Python Backend** | Linux/Mac, dev environments | 15 minutes | `pip install` → `python main.py` |

**All options include all dependencies - nothing extra to install at the deployment site!**

---

## Operator Quick Start (Config Only)

Use this checklist if you are an operator/admin and do not write code.

1. Use the standalone EXE or WAR format for target servers.
2. Do not install Python, Node.js, or Java on the target server.
3. Get the built artifact from releases:
  - `was-dashboard.exe` (Windows), or
  - `was-dashboard.war` (Any Java container)
4. Run the executable or deploy the WAR.
5. Open `http://localhost:8000` (or configured port).
6. Configure only via the **single config file**:
  - `config/environment.yml`
7. Add servers from the UI using `+ Add Server` button.
8. **Do NOT edit source code** - use config file only!

---

## Table of Contents

1. [What This Tool Does](#1-what-this-tool-does)
2. [Who Is It For](#2-who-is-it-for)
3. [Prerequisites](#3-prerequisites)
4. [Quick Deploy](#4-quick-deploy)
5. [Configuration Reference](#5-configuration-reference)
6. [Running the Dashboard](#6-running-the-dashboard)
7. [Using the Dashboard UI](#7-using-the-dashboard-ui)
8. [Build Formats – EXE, WAR, JAR](#8-build-formats)
9. [Setting Up Real Server Connectivity](#9-setting-up-real-server-connectivity)
10. [API Reference](#10-api-reference)
11. [Troubleshooting](#11-troubleshooting)
12. [Security Best Practices](#12-security-best-practices)
13. [Project Structure](#13-project-structure)

---

## 1. What This Tool Does

The WebSphere Admin Dashboard gives every team member – sysadmin, developer,
DBA or manager – a **single browser page** to see and control the full IBM
middleware stack across multiple data centres:

| Layer | Technology |
|-------|-----------|
| Web / Reverse Proxy | IIS (Windows Server) |
| ODR / Gateway | IBM On-Demand Routers |
| Application Servers | IBM WebSphere AS clusters |
| Content Management | IBM FileNet Content Platform Engine (CPE) |
| Content Navigation | IBM Content Navigator (ICN) |

**Key features:**
- HA/DR aware – Primary and DR sites shown in separate tabs with colour-coding
- Cluster aware – WAS members grouped under their cluster with a running count
- Start / Stop / Restart any server with a confirmation dialog
- **Add new servers directly from the UI** without editing any config files
- Auto-refresh every 30 seconds (configurable)
- Activity log showing who did what and when
- Simulation mode – full UI without any real servers
- Five deployment formats: Python app, Java JAR/WAR, standalone EXE, Docker
- Single YAML config file covers all backends with no code changes needed
- Slim backend: only **4 core Python packages** required

---

## 2. Who Is It For

| Role | What you get |
|------|-------------|
| **System Administrator** | Start/stop/restart any server, see real-time status |
| **Developer / QA** | Check if app servers are running before testing |
| **Manager / DBA** | Read-only view of all middleware health |
| **DevOps / Operations** | REST API for scripting, monitoring integrations |
| **New team member** | Zero learning curve – everything visible at a glance |

---

## 3. Prerequisites

### Quick-reference by deployment type

| What you want to do | Software needed |
|---------------------|-----------------|
| Run the Python app | Python 3.10+, Node.js 18+ |
| Build / run Java JAR | Java JDK 17+, Maven 3.8+, Node.js 18+ |
| Run the standalone EXE | **Nothing** – fully bundled |
| Run via Docker | Docker Desktop (any recent version) |

---

### Python version (recommended)

| Software | Minimum | Download | Verify |
|----------|---------|----------|--------|
| Python | **3.10+** | https://www.python.org/downloads/ | `python --version` |
| Node.js | **18+** | https://nodejs.org/ | `node --version` |
| Git | Any | https://git-scm.com/ | Optional – for cloning |

> **Windows install tip:** When installing Python, tick **"Add Python to PATH"**.
> When installing Node.js, the installer adds it to PATH automatically.

Verify both are installed before running `setup.bat`:
```bat
python --version
node --version
```

**Python packages installed automatically by `setup.bat`** (4 core packages only):

| Package | Purpose |
|---------|---------|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI web server |
| `pyyaml` | Reads `environment.yml` config |
| `python-dotenv` | Loads secrets from `backend\.env` |
| `paramiko` | SSH to Linux WAS nodes *(only needed when `simulation_mode: false`)* |

No `requests`, no `httpx`, no extra frameworks – the backend is intentionally lean.

---

### Java JAR / WAR version

| Software | Minimum | Download | Verify |
|----------|---------|----------|--------|
| Java JDK | **17+** | https://adoptium.net/ | `java -version` |
| Maven | **3.8+** | https://maven.apache.org/ | `mvn -version` |
| Node.js | **18+** | https://nodejs.org/ | `node --version` |

```bat
java -version
mvn -version
node --version
```

---

### Standalone EXE (zero dependencies)

No Python, no Java, no Node.js required on the target machine.
The EXE bundles the entire Python runtime and the built React frontend.
Just copy the `dist\was-dashboard\` folder and run `was-dashboard.exe`.

---

### Docker

| Software | Version | Download |
|----------|---------|----------|
| Docker Desktop | Any recent | https://www.docker.com/products/docker-desktop |

Verify: `docker --version`

---

## 4. Installation and First Run

### Step-by-step for a new user (from scratch)

Use these exact steps when someone new needs to run the dashboard for the first time.

### Path A (recommended): No-install on target server

This is the preferred operator path.

Target server requirements:
- No Python install
- No Node.js install
- No Java install

Steps:
1. Get `was-dashboard-windows.zip` from a release/artifact link.
2. Extract it on the target server.
3. Update only:
  - `config\environment.yml`
  - `backend\.env`
4. Start one of these ways:
  - EXE mode: run `dist\was-dashboard\was-dashboard.exe`
  - Service mode: run `deploy-service.bat "C:\Deploy\was-dashboard"` as Administrator
5. Open `http://localhost:8000`.

### Path B: Developer/build-machine mode

Use this only on machines where you are building from source.

Config-only rule for users:
- Users should not edit source code.
- Users should only change configuration values in `config\environment.yml` and `backend\.env`.
- If a new server is needed, use the dashboard UI (`+ Add`) instead of editing Python/React/Java files.

1. Install prerequisites on Windows (build machine only):
  - Python 3.10+
  - Node.js 18+
  - (Optional) Git
2. Get the code:
  - Clone: `git clone https://github.com/paresh53/websphere-admin-dashboard.git`
  - Or download ZIP and extract to `C:\websphere-admin-dashboard`
3. Open Command Prompt or PowerShell in the project root folder.
4. Run one-time setup:
  - `setup.bat`
  - This creates `backend\venv`, installs backend + frontend dependencies, builds frontend, and creates `backend\.env` if missing.
5. Start the app:
  - `start.bat`
6. Open the dashboard:
  - `http://localhost:8000`
7. Confirm the app is healthy:
  - `http://localhost:8000/health` should return `{\"status\":\"ok\"}`
8. Keep simulation ON for a first demo run.
9. When ready for real servers, turn simulation OFF from the banner or set in config:
  - In `config\environment.yml` set `app.simulation_mode: false`
10. Fill real environment values:
   - `deployment_manager.host` and `deployment_manager.cell_name`
   - Password env vars in `backend\.env` (never plain passwords in YAML)
11. Add servers from the UI using `+ Add` in each section.
12. For WAS servers, either:
   - choose an existing cluster, or
   - click `+ New Cluster` in the Add Server dialog and create one.

Do not edit code files during normal operations:
- Do not modify anything under `backend\` (except `backend\.env`)
- Do not modify anything under `frontend\`
- Do not modify anything under `java\`

Important behavior when simulation is OFF:
- The dashboard shows only real/user-added servers.
- Example/demo servers are hidden.

### Step 1 – Download the project

**Option A – Clone from GitHub**
```bat
git clone https://github.com/paresh53/websphere-admin-dashboard.git
cd websphere-admin-dashboard
```

**Option B – Download ZIP**
Download the ZIP from GitHub → Extract to `C:\websphere-admin-dashboard\`

---

### Step 2 – One-time setup (Python version only, build machine)

Run the setup script from the project root:

```bat
setup.bat
```

This script will:
- Check that Python 3.8+ and Node.js 18+ are installed
- Create a Python virtual environment in `backend\venv\`
- Install all Python dependencies (`fastapi`, `uvicorn`, `paramiko`, etc.)
- Build the React frontend to `frontend\dist\`
- Copy `backend\.env.example` to `backend\.env`

If setup fails, check the error message – most failures are a missing Python
or Node.js installation.

---

### Step 3 – Try it in simulation mode

The project starts in **simulation mode** by default – no real servers needed.

```bat
start.bat
```

Open your browser at **http://localhost:8000**

You will see 21 simulated servers across Primary and DR sites with realistic
running/standby statuses. This is a safe sandbox – no real servers are
touched.

---

## 5. Configuring Your Environment

### Important: Users should update config only

For daily operations and onboarding, users must update only:
- `config\environment.yml`
- `backend\.env`

Users should not make source-code changes in `backend\`, `frontend\`, or `java\`.
All normal tasks (switch simulation mode, add servers, create clusters, update endpoints and credentials) are supported through config values and the dashboard UI.

All configuration lives in **one file**: `config\environment.yml`

Open it in any text editor (Notepad, VS Code, Notepad++):

```bat
notepad config\environment.yml
```

### Minimum changes to make it work with YOUR servers

**a) Turn off simulation mode** (after testing is complete):
```yaml
app:
  simulation_mode: false
```

**b) Add your site names** (edit or keep as-is):
```yaml
sites:
  - id: "primary"
    name: "Primary Site"
    location: "DC1 – New York"    # your data centre name
    is_primary: true
    color: "#1e40af"              # blue for primary
  - id: "dr"
    name: "DR Site"
    location: "DC2 – Chicago"
    is_primary: false
    color: "#7c3aed"              # purple for DR
```

**c) Set your Deployment Manager host:**
```yaml
deployment_manager:
  host: "your-dmgr.company.com"    # ← change this
  cell_name: "YourCell01"          # ← change this
  admin_username: "wsadmin"
  admin_password_env: "DMGR_PASSWORD"   # set this env var, not here
```

**d) Add your WAS cluster members** (example: CP01, CP02, CP03, CP04):
```yaml
clusters:
  - id: "content_cluster_primary"
    name: "ContentCluster01"
    site_id: "primary"
    was_home: "/opt/IBM/WebSphere/AppServer"
    profile_name: "AppSrv01"
    ssh_username: "wasadmin"
    ssh_key_env: "WAS_SSH_KEY_PATH"
    admin_username: "wsadmin"
    admin_password_env: "DMGR_PASSWORD"
    members:
      - id: "cp01"
        name: "CP01"
        server_name: "CPEServer01"
        node_name: "CPENode01"
        host: "cp01.company.com"
        http_port: 9080
        https_port: 9443

      - id: "cp02"
        name: "CP02"
        server_name: "CPEServer02"
        node_name: "CPENode02"
        host: "cp02.company.com"
        http_port: 9080
        https_port: 9443

      - id: "cp03"
        name: "CP03"
        server_name: "CPEServer03"
        node_name: "CPENode03"
        host: "cp03.company.com"
        http_port: 9080
        https_port: 9443

      - id: "cp04"
        name: "CP04"
        server_name: "CPEServer04"
        node_name: "CPENode04"
        host: "cp04.company.com"
        http_port: 9080
        https_port: 9443
```

**e) Set passwords via environment variables – never in the YAML file:**

Open `backend\.env` and set real values:
```
DMGR_PASSWORD=your_wsadmin_password
WAS_SSH_KEY_PATH=C:/Users/you/.ssh/id_rsa
IIS_P01_PASSWORD=your_iis_password
IIS_P02_PASSWORD=your_iis_password
IIS_DR_PASSWORD=your_iis_dr_password
```

---

## 6. Running the Dashboard

### Option A – Standalone EXE (recommended for target servers, no install)

Target server requirements:
- No Python install
- No Node.js install
- No Java install

```bat
# Run:
dist\was-dashboard\was-dashboard.exe
```

Opens at **http://localhost:8000**

### Option B – Windows Service (recommended for always-on target servers, no install)

```bat
# Run as Administrator on target server:
deploy-service.bat "C:\Deploy\was-dashboard"
```

Notes:
- Service name: `WASDashboard`
- Install location: `%ProgramData%\WASDashboard`
- Uninstall: `uninstall-service.bat` (run as Administrator)
- If no argument is passed, the script still falls back to the latest GitHub release zip.

### Option C – Python (developer/build machine)

```bat
# First time only:
setup.bat

# Every time:
start.bat
```

Opens at **http://localhost:8000**

To change the port:
```bat
SET BACKEND_PORT=9090
start.bat
```

### Option D – Java JAR

Requirements: Java 17+

```bat
# Build once:
build-jar.bat

# Run:
start-jar.bat

# Or run manually with a custom config path:
java -Dwas.dashboard.config="D:\myconfig\environment.yml" -jar java\target\was-dashboard.jar
```

### Option E – Build standalone EXE bundle (maintainer/build machine)

```bat
# Build once:
build-app.bat
```

To distribute to another machine: copy the entire `dist\was-dashboard\` folder.
Edit the `config\environment.yml` inside that folder for the target environment.

### Option E1 – Build service bundle artifact (maintainer/build machine)

This option lets operators run the dashboard as a background Windows service
without installing Python/Node/Java on the target server.

Build machine (one-time by maintainer):
1. Build EXE bundle:
  - `build-app.bat`
2. Package zip artifact:
  - `package-service-bundle.bat`
3. Upload `release\was-dashboard-windows.zip` to GitHub Releases or internal artifact storage.

Target machine (operator):
1. Run as Administrator:
  - `deploy-service.bat "C:\Deploy\was-dashboard"`
2. If no folder path is passed, script uses the default GitHub release zip.
3. Service name:
  - `WASDashboard`
4. Install location:
  - `%ProgramData%\WASDashboard`
5. Open:
  - `http://localhost:8000`

Uninstall service:
- Run as Administrator: `uninstall-service.bat`

Notes:
- Target machine needs no Python/Node/Java installation.
- Service registration requires Administrator rights.
- Users still only update `config\environment.yml` and `backend\.env` in deployed folder.

### Option F – Docker

```bat
# Build frontend first:
cd frontend
npm install
npm run build
cd ..

# Start everything:
docker-compose up -d

# View logs:
docker-compose logs -f

# Stop:
docker-compose down
```

Opens at **http://localhost:8000**

### Option G – Java WAR (deploy to existing WebSphere or Tomcat)

```bat
build-war.bat
```

**Deploy to WebSphere Application Server:**
1. Log in to WebSphere Admin Console (https://dmgr:9043/ibm/console)
2. Applications → New Application → New Enterprise Application
3. Upload `java\target\was-dashboard.war`
4. Set context root to `/`
5. Go to servers → server1 → Java and Process Management → Process Definition → Java Virtual Machine → Custom Properties
6. Add property: `was.dashboard.config` = `/opt/config/environment.yml`
7. Save and restart the application

**Deploy to Apache Tomcat:**
```bash
cp java/target/was-dashboard.war $TOMCAT_HOME/webapps/ROOT.war
# Add to setenv.sh:
JAVA_OPTS="$JAVA_OPTS -Dwas.dashboard.config=/opt/config/environment.yml"
```

---

## 7. Using the Dashboard UI

### Navigation bar (top)

| Element | What it does |
|---------|-------------|
| **Dashboard title** | App name from config |
| **Site tabs** (All / Primary / DR) | Filter all panels by data-centre site |
| **Refresh button** | Manually refresh all server statuses |
| **Last updated time** | When the backend last polled servers |

### Summary bar (below nav)

Shows totals at a glance:
- **Total Servers** – count of all configured servers
- **Running** – servers with open ports / confirmed running
- **Stopped** – servers with closed ports / confirmed stopped
- **Per-site cards** – running/stopped breakdown per data centre with a
  progress bar

### Server sections

Servers are grouped into five sections:

| Section | Icon | Content |
|---------|------|---------|
| WebSphere Application Clusters | Layers | Clusters as collapsible panels; members shown in a grid |
| On-Demand Routers (ODR) | Router | ODR servers |
| IIS Web Servers | Globe | IIS front-end servers |
| Content Platform Engine (FileNet) | Database | CPE servers (CP01–CP04, etc.) |
| IBM Content Navigator (ICN) | BookOpen | ICN servers |

### Server card

Each server shows:
- Coloured type badge (WAS / ODR / IIS / CPE / ICN)
- Server name, hostname, node name, cluster name
- HA or DR site badge (colour-coded)
- Status badge: **Running** (green) / **Stopped** (red) / **Unknown** (grey)
- Time since last check
- Message from the last status check
- **Start**, **Stop**, **Restart** buttons
- **Admin** link (for CPE and ICN – opens the admin console URL)

### Starting or stopping a server

1. Find the server card
2. Click **Start**, **Stop**, or **Restart**
3. A confirmation dialog appears with the action and server name
4. Click **Confirm** to proceed or **Cancel**
5. A toast notification (top-right) confirms success or shows an error
6. The card status updates automatically

### Auto Start/Stop timer (with live countdown)

Each server card now includes an **Auto Action Timer**.

1. In a server card, find **Auto Action Timer**.
2. Choose action: **Start** or **Stop**.
3. Enter delay in seconds (for example `300` for 5 minutes).
4. Click **Set Timer**.
5. The card shows a live countdown, for example:
  - `Auto stop in 04:59`
6. When countdown reaches zero, the action runs automatically.
7. To cancel before execution, click **Cancel** on the same card.

Notes:
- Timer is per server card and runs in the open browser session.
- If you refresh/close the browser tab, scheduled timers are cleared.

### Daily automatic schedule (persistent)

Use this when you want the same action every day, for example:
- stop and restart automatically at **5:00 PM** daily.

How to set it:
1. Open the server card.
2. In **Daily Schedule**, enable the toggle.
3. Select action:
  - `restart` (recommended for stop+start cycle)
  - or `stop` / `start`
4. Set time to `17:00` (5 PM).
5. Click **Save Daily**.
6. The card shows a continuously updating countdown to next run.

How it runs:
- The schedule is saved in `config\environment.yml` for that server.
- Backend executes the action once per day at the configured time.
- `restart` performs automated restart flow for that server.

### Site tabs

- **All** – see every server from every data centre
- **Primary Site** – filter to primary/active data centre only
- **DR Site** – filter to DR data centre only (servers show "DR standby" in simulation mode)

### Activity log (bottom)

Shows the last 100 operations with timestamp, server name, action, and result.
Useful for auditing who started or stopped what.

---

### Adding a New Server from the UI

You can add a server to the dashboard **without editing any files** and without
a restart. Every section header has an **"+ Add"** button:

1. Click **"+ Add"** next to the section you want (e.g., Content Platform Engine)
2. The **Add New Server** modal opens with the correct type pre-selected
3. Fill in the form fields:

   | Field | Description |
   |-------|-------------|
   | Server Type | WAS / ODR / IIS / CPE / ICN – changes visible fields dynamically |
   | Site | Primary or DR |
   | Server ID | Unique lowercase id, e.g. `cp05` (auto-generates server/node name) |
   | Display Name | Label shown on the card, e.g. `CP05` |
   | Hostname / IP | DNS name or IP address of the server |
   | HTTP Port | Port used for TCP status checks (default 9080) |
   | Server Name | WAS server name used by `startServer.sh` |
   | Node Name | WAS node name |
   | WAS Home | Install path, e.g. `/opt/IBM/WebSphere/AppServer` |
   | SSH / WinRM | Credentials via env-var names (never raw passwords) |
   | Add to Cluster | WAS only – optionally join an existing cluster |

4. A **preview badge** at the bottom shows how the card will look
5. Click **Add Server** – the server is:
   - Written to `config\environment.yml` immediately
   - Hot-loaded into the running backend (no restart needed)
   - Visible on the dashboard within seconds

> **Simulation mode:** the new server will show a simulated status
> (running for Primary site, stopped/standby for DR site).

---

## 8. Build Formats

### Summary

| Format | Build command | Output file | Who runs it |
|--------|--------------|-------------|------------|
| Python app | `setup.bat` then `start.bat` | No output file needed | Anyone with Python |
| Java JAR | `build-jar.bat` | `java\target\was-dashboard.jar` | Anyone with Java 17+ |
| Java WAR | `build-war.bat` | `java\target\was-dashboard.war` | WebSphere / Tomcat server |
| Windows EXE | `build-app.bat` | `dist\was-dashboard\was-dashboard.exe` | Anyone on Windows |
| Docker image | `docker-compose build` | Docker image | Docker Desktop |

### When to use which format

- **Python app** – development, testing, or when your ops team already has Python
- **Java JAR** – when you want a single file that any sysadmin can run with `java -jar`
- **Java WAR** – when you want to deploy inside an existing WebSphere or Tomcat container
- **Windows EXE** – when distributing to machines with no Java or Python (air-gapped environments, junior admins)
- **Docker** – when you use containers and want an isolated, reproducible deployment

---

## 9. Configuration Reference

Full reference for every section of `config\environment.yml`:

### app section

```yaml
app:
  name: "WebSphere Admin Dashboard"      # title shown in the browser tab
  title: "IBM Middleware Administration"  # subtitle in the navbar
  refresh_interval: 30                   # auto-refresh in seconds (0 = disable)
  backend_port: 8000                     # port the backend listens on
  simulation_mode: true                  # true = no SSH/WinRM, fake statuses
  auth_enabled: false                    # true = require login to view dashboard
  auth_username: "admin"                 # login username (when auth_enabled)
  auth_password_env: "DASHBOARD_PASSWORD" # env var that holds the password
```

### deployment_manager section

```yaml
deployment_manager:
  host: "dmgr01.company.com"     # DMGR hostname or IP
  soap_port: 8879                # SOAP connector port (default 8879)
  admin_http_port: 9060          # Admin console HTTP port
  admin_https_port: 9043         # Admin console HTTPS port
  admin_username: "wsadmin"      # WAS admin user
  admin_password_env: "DMGR_PASSWORD"  # env var for password
  cell_name: "MYCell01"          # WAS cell name
  was_home: "/opt/IBM/WebSphere/AppServer"  # WAS install path on server
  profile_name: "Dmgr01"         # DMGR profile name
  ssh_username: "wasadmin"       # OS user for SSH
  ssh_key_env: "WAS_SSH_KEY_PATH"  # env var pointing to SSH private key
```

### sites section

```yaml
sites:
  - id: "primary"          # unique identifier used in server site_id fields
    name: "Primary Site"   # display name shown in the tab
    location: "DC1 – NY"   # shown in the site stat card
    is_primary: true       # true = HA site, false = DR site
    color: "#1e40af"       # hex colour for the site badge
```

You can define any number of sites. Add a third site for a staging environment, etc.

### clusters section

```yaml
clusters:
  - id: "app_cluster_primary"   # unique id
    name: "AppCluster01"        # display name on the cluster header
    site_id: "primary"          # must match a site id above
    was_home: "/opt/IBM/WebSphere/AppServer"
    profile_name: "AppSrv01"
    ssh_username: "wasadmin"
    ssh_key_env: "WAS_SSH_KEY_PATH"
    admin_username: "wsadmin"
    admin_password_env: "DMGR_PASSWORD"
    members:
      - id: "cp01"              # unique id for this server card
        name: "CP01"            # display name on the card
        server_name: "CPEServer01"  # WAS server name (for startServer.sh)
        node_name: "CPENode01"      # WAS node name
        host: "cp01.company.com"    # hostname of the machine
        http_port: 9080             # used for TCP port-check status
        https_port: 9443
```

To add instances CP01 through CP04 all to the same cluster, add four entries
in the `members` list. Each entry needs a unique `id`.

### odr_servers section

```yaml
odr_servers:
  - id: "odr_p01"
    name: "ODR-P01"
    site_id: "primary"
    server_name: "ODRServer01"
    node_name: "ODRNode01"
    host: "odr-p01.company.com"
    http_port: 9080
    https_port: 9443
    was_home: "/opt/IBM/WebSphere/AppServer"
    profile_name: "AppSrv01"
    ssh_username: "wasadmin"
    ssh_key_env: "WAS_SSH_KEY_PATH"
    admin_username: "wsadmin"
    admin_password_env: "DMGR_PASSWORD"
```

### iis_servers section

```yaml
iis_servers:
  - id: "iis_p01"
    name: "IIS-P01"
    site_id: "primary"
    host: "iis-p01.company.com"
    winrm_port: 5985           # WinRM HTTP port (5985) or HTTPS (5986)
    winrm_use_ssl: false       # true for HTTPS WinRM
    winrm_username: "DOMAIN\\iisadmin"
    winrm_password_env: "IIS_P01_PASSWORD"
    iis_sites:
      - name: "Default Web Site"
        app_pools: ["DefaultAppPool", "WASProxyPool"]
```

### content_platform section (CPE)

```yaml
content_platform:
  - id: "cp01"
    name: "CP01"
    site_id: "primary"
    server_name: "CPEServer01"
    node_name: "CPENode01"
    host: "cp01.company.com"
    http_port: 9080
    https_port: 9443
    admin_url: "http://cp01.company.com:9080/acce"  # link on the card
    was_home: "/opt/IBM/WebSphere/AppServer"
    profile_name: "AppSrv01"
    ssh_username: "wasadmin"
    ssh_key_env: "WAS_SSH_KEY_PATH"
    admin_username: "wsadmin"
    admin_password_env: "DMGR_PASSWORD"
```

### content_navigator section (ICN)

```yaml
content_navigator:
  - id: "icn_p01"
    name: "ICN-P01"
    site_id: "primary"
    server_name: "ICNServer01"
    node_name: "ICNNode01"
    host: "icn-p01.company.com"
    http_port: 9080
    https_port: 9443
    admin_url: "http://icn-p01.company.com:9080/navigator"
    was_home: "/opt/IBM/WebSphere/AppServer"
    profile_name: "AppSrv01"
    ssh_username: "wasadmin"
    ssh_key_env: "WAS_SSH_KEY_PATH"
    admin_username: "wsadmin"
    admin_password_env: "DMGR_PASSWORD"
```

### Adding a new server – two ways

**Option A – From the UI (recommended, no restart needed):**
1. Click **"+ Add"** in any section header on the dashboard
2. Fill the form and click **Add Server**
3. Server appears immediately – config file is updated automatically

**Option B – Edit the YAML directly:**
1. Choose the right section (`clusters` > `members`, `odr_servers`, `iis_servers`, `content_platform`, or `content_navigator`)
2. Copy an existing entry
3. Give it a new unique `id` (e.g., `cp05`)
4. Update `name`, `host`, `server_name`, `node_name`
5. Set `site_id` to either `"primary"` or `"dr"` (or a custom site id)
6. Save the file – the backend hot-reloads within 30 seconds

No code changes needed either way.

---

## 10. Setting Up Real Server Connectivity

This section only applies when `simulation_mode: false`.

### SSH setup for WAS / ODR / CPE / ICN

The dashboard uses SSH to run `startServer.sh` and `stopServer.sh` on each node.

**Step 1 – Generate an SSH key pair (on the dashboard machine):**
```bash
ssh-keygen -t ed25519 -f C:\Users\you\.ssh\was_dashboard -N ""
```
On Linux/Mac:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/was_dashboard -N ""
```

**Step 2 – Copy the public key to every WAS node:**
```bash
ssh-copy-id -i ~/.ssh/was_dashboard.pub wasadmin@was-p01.company.com
ssh-copy-id -i ~/.ssh/was_dashboard.pub wasadmin@was-p02.company.com
ssh-copy-id -i ~/.ssh/was_dashboard.pub wasadmin@cp01.company.com
# ... repeat for all nodes
```

On Windows (PowerShell):
```powershell
type C:\Users\you\.ssh\was_dashboard.pub | ssh wasadmin@was-p01.company.com "mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

**Step 3 – Set the env var in `backend\.env`:**
```
WAS_SSH_KEY_PATH=C:/Users/you/.ssh/was_dashboard
```

**Step 4 – Test the key manually:**
```bash
ssh -i ~/.ssh/was_dashboard wasadmin@was-p01.company.com "echo OK"
```

You should see `OK` with no password prompt.

**What the dashboard runs via SSH:**
```bash
# Start:
/opt/IBM/WebSphere/AppServer/bin/startServer.sh AppServer01 -profileName AppSrv01

# Stop:
/opt/IBM/WebSphere/AppServer/bin/stopServer.sh AppServer01 -profileName AppSrv01 -username wsadmin -password <DMGR_PASSWORD>

# Status check:
TCP port check on http_port (9080 by default)
```

---

### WinRM setup for IIS servers

The dashboard uses WinRM (Windows Remote Management) to run PowerShell
commands on IIS servers.

**Step 1 – Enable WinRM on each IIS server (run as Administrator):**
```powershell
Enable-PSRemoting -Force
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "dashboard-machine-ip"
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true
netsh advfirewall firewall add rule name="WinRM HTTP" protocol=TCP dir=in localport=5985 action=allow
```

**Step 2 – Test WinRM from the dashboard machine:**
```powershell
Test-WsMan -ComputerName iis-p01.company.com
```
Or test with credentials:
```powershell
$cred = Get-Credential
Enter-PSSession -ComputerName iis-p01.company.com -Credential $cred
```

**Step 3 – Set IIS passwords in `backend\.env`:**
```
IIS_P01_PASSWORD=YourIISPassword
IIS_P02_PASSWORD=YourIISPassword
IIS_DR_PASSWORD=YourIISPassword
```

**What the dashboard runs via WinRM:**
```powershell
# Start IIS site / app pool:
Import-Module WebAdministration; Start-Website "Default Web Site"

# Stop:
Import-Module WebAdministration; Stop-Website "Default Web Site"

# Status:
(Get-Website "Default Web Site").State
```

---

## 11. API Reference

Both the Python and Java backends expose the same REST API. Use it to
integrate the dashboard with monitoring tools, CI/CD pipelines, or scripts.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check – returns `{"status":"ok"}` |
| GET | `/api/status` | Full dashboard payload (all servers, sites, counts) |
| GET | `/api/servers` | Flat list of all servers |
| GET | `/api/servers/{id}/status` | Refresh and return status for one server |
| POST | `/api/servers/{id}/start` | Start a server |
| POST | `/api/servers/{id}/stop` | Stop a server |
| POST | `/api/servers/{id}/restart` | Restart a server |
| POST | `/api/refresh` | Refresh all server statuses |
| GET | `/api/logs` | Activity log (last 100 entries) |
| GET | `/api/config` | Current config with passwords redacted |
| **POST** | **`/api/servers/add`** | **Add a new server (writes to YAML + hot-reloads)** |
| GET | `/api/sites` | List of configured sites (for the Add Server form) |
| GET | `/api/clusters/list` | List of cluster ids/names (for the Add Server form) |
| PATCH | `/api/settings/simulation` | Toggle simulation mode on/off (persists to YAML) |
| PATCH | `/api/settings/dmgr` | Update Deployment Manager connection details |

**Example – check if a server is running:**
```bash
curl http://localhost:8000/api/servers/cp01/status
```
```json
{"id":"cp01","status":"running","message":"Port 9080 open","last_checked":"..."}
```

**Example – start a server:**
```bash
curl -X POST http://localhost:8000/api/servers/cp01/start
```
```json
{"success":true,"message":"[SIMULATION] start called on CP01","server_id":"cp01","action":"start"}
```

**Example – get full status:**
```bash
curl http://localhost:8000/api/status
```

**Interactive API documentation (Python only):**
Open http://localhost:8000/docs for the Swagger UI.

---

## 12. Troubleshooting

### "Port 8000 is already in use"
```bat
:: Find what is using port 8000:
netstat -ano | findstr :8000

:: Kill it (replace NNNN with the PID):
taskkill /PID NNNN /F
```

### "Python not found" or "Node not found"
- Install Python from https://www.python.org/downloads/
  - During install, check "Add Python to PATH"
- Install Node.js from https://nodejs.org/ (LTS version)
- Close and reopen your terminal after installing

### Backend starts but dashboard is blank
- Make sure the frontend was built: run `setup.bat` again
- Open http://localhost:8000/health – it should return `{"status":"ok"}`
- Check `backend\venv\Scripts\python.exe main.py` for error output

### "SSH connection refused" / servers show Unknown
1. Confirm `simulation_mode: false` in `environment.yml`
2. Test SSH manually: `ssh wasadmin@your-server.company.com`
3. Check the SSH key path in `backend\.env` → `WAS_SSH_KEY_PATH`
4. Confirm the `wasadmin` user has execute permission on the WAS bin scripts:
   ```bash
   ls -la /opt/IBM/WebSphere/AppServer/bin/startServer.sh
   ```

### "WinRM connection failed" for IIS servers
1. Run `Enable-PSRemoting -Force` on the IIS server
2. Check firewall allows port 5985
3. Test: `Test-WsMan -ComputerName iis-p01.company.com`
4. Confirm `winrm_username` uses the format `DOMAIN\\user` (double backslash in YAML)

### Java JAR fails to start
```bat
java -version
```
Must be Java 17 or newer. Update from https://adoptium.net/

### Changes to `environment.yml` not showing
- **Added via the UI / API** – changes are hot-loaded instantly; no restart needed.
- **Edited the YAML file directly** – the backend reads the file once at startup. Restart to pick up manual edits:
  ```bat
  :: Stop the running backend (Ctrl+C in its terminal) then:
  start.bat
  ```

---

## 13. Security Best Practices

1. **Never put passwords in `environment.yml`** – always use `_env:` keys that
   point to environment variable names

2. **Keep `backend\.env` out of version control** – it is listed in `.gitignore`
   already; double-check before pushing

3. **Enable auth for shared / exposed deployments:**
   ```yaml
   app:
     auth_enabled: true
     auth_username: "admin"
     auth_password_env: "DASHBOARD_PASSWORD"
   ```
   Then set `DASHBOARD_PASSWORD=StrongPassword123` in `backend\.env`

4. **Run behind a corporate VPN or reverse proxy** – do not expose port 8000
   directly to the internet

5. **Use SSH keys, not passwords** for WAS connectivity. SSH keys provide
   better audit trails and avoid password exposure over the network

6. **Rotate the SSH key** periodically and remove it from `authorized_keys`
   when a team member leaves

7. **Use HTTPS WinRM** for IIS servers in production:
   ```yaml
   winrm_use_ssl: true
   winrm_port: 5986
   ```

8. **The `/api/config` endpoint redacts all values that reference env vars** –
   safe to use in dashboards or monitoring integrations

---

## 14. Project Structure

```
websphere-admin-dashboard/
│
├── config/
│   └── environment.yml          ← THE config file – edit this for your env
│
├── backend/                     ← Python FastAPI application
│   ├── main.py                  ← Entry point, API routes, startup
│   ├── server_manager.py        ← Inventory, status cache, actions
│   ├── websphere_client.py      ← SSH → WAS startServer / stopServer
│   ├── iis_client.py            ← WinRM → IIS PowerShell commands
│   ├── config_loader.py         ← YAML loader + env var resolver
│   ├── models.py                ← Pydantic data models
│   ├── requirements.txt         ← Python dependencies
│   ├── .env.example             ← Template for passwords
│   └── Dockerfile               ← For Docker deployment
│
├── java/                        ← Java Spring Boot application (JAR / WAR)
│   ├── pom.xml                  ← Maven build – jar profile + war profile
│   └── src/main/java/com/ibm/was/dashboard/
│       ├── WasDashboardApplication.java
│       ├── controller/          ← REST API (mirrors Python routes)
│       ├── service/             ← SSH, WinRM, config, server manager
│       └── model/               ← Java POJOs
│
├── frontend/                    ← React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx              ← Root component, state management
│   │   ├── services/api.js      ← Axios calls to backend
│   │   └── components/
│   │       ├── Dashboard.jsx    ← Main content area
│   │       ├── ClusterView.jsx  ← Collapsible WAS cluster panel
│   │       ├── ServerCard.jsx   ← Individual server card
│   │       ├── SummaryStats.jsx ← Top stats bar
│   │       ├── Navbar.jsx       ← Navigation + site tabs
│   │       ├── ActivityLog.jsx  ← Action history
│   │       ├── StatusBadge.jsx  ← Running / Stopped / Unknown badge
│   │       └── ConfirmModal.jsx ← Action confirmation dialog
│   └── dist/                   ← Built frontend (served by backend)
│
├── setup.bat                    ← One-time Python + Node setup
├── start.bat                    ← Start Python backend
├── start-dev.bat                ← Start backend + frontend dev server
├── build-jar.bat                ← Build Java fat JAR
├── build-war.bat                ← Build Java WAR
├── build-app.bat                ← Build Windows standalone EXE
├── start-jar.bat                ← Run the JAR
├── was-dashboard.spec           ← PyInstaller EXE spec file
├── docker-compose.yml           ← Docker Compose for containerised run
├── nginx.conf                   ← Nginx config for Docker
└── .gitignore                   ← Excludes venv, node_modules, .env, secrets
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│  FIRST TIME                                                     │
│  1. Extract was-dashboard-windows.zip on target server          │
│  2. Edit config\environment.yml and backend\.env               │
│  3. Run dist\was-dashboard\was-dashboard.exe                   │
│  4. Or deploy-service.bat C:\Deploy\was-dashboard as Admin    │
├─────────────────────────────────────────────────────────────────┤
│  EVERYDAY USE                                                   │
│  EXE mode: run was-dashboard.exe                                │
│  Service mode: WASDashboard runs in background                  │
├─────────────────────────────────────────────────────────────────┤
│  BUILD ONCE, SHARE ANYWHERE                                     │
│  build-app.bat     → dist\was-dashboard\was-dashboard.exe       │
│  package-service-bundle.bat → release\was-dashboard-windows.zip │
│  build-jar.bat     → java\target\was-dashboard.jar              │
│  build-war.bat     → java\target\was-dashboard.war              │
└─────────────────────────────────────────────────────────────────┘
```

---

## License

MIT – free to use, modify, and distribute within your organisation.
