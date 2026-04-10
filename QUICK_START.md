# ⚡ QUICK START (5 MINUTES)

For business users who want to get the dashboard running **right now**.

---

## Step 1: Choose Your Deployment (2 minutes)

### Option A: Windows EXE (Easiest)
```
✅ Works on Windows
✅ Single executable file
✅ No installation needed
✅ Just run and use
```

**Go to:** [BUILD_EXE.bat](BUILD_EXE.bat) section below

### Option B: Deploy to WebSphere/Tomcat (Enterprise)
```
✅ Works on any Java server
✅ Enterprise friendly
✅ Standard WAR format
✅ Integrates with existing infrastructure
```

**Go to:** [BUILD_WAR.bat](BUILD_WAR.bat) section below

---

## For Windows EXE Path

### Build It (Windows Only)

1. **Requirements:**
   - Windows 7 or later
   - Node.js installed from https://nodejs.org
   - Python 3.10+ installed from https://www.python.org

2. **Run build script:**
   ```batch
   # Double-click or run:
   BUILD_EXE.bat
   
   # Wait for completion (10-15 minutes)
   ```

3. **Output:**
   ```
   ✅ backend/dist/was-dashboard.exe
   ```

### Run It

1. **Create config file:**
   ```
   Copy: config/environment.yml (already exists)
   Edit it with your servers (see CONFIG_GUIDE.md)
   ```

2. **Set environment variables:**
   ```batch
   # Command Prompt (or System Settings)
   set DMGR_PASSWORD=your_admin_password
   set WAS_SSH_KEY_PATH=C:\path\to\ssh\key
   ```

3. **Run the EXE:**
   ```batch
   # Double-click: backend/dist/was-dashboard.exe
   OR
   # Command line:
   backend\dist\was-dashboard.exe
   ```

4. **Open in browser:**
   ```
   http://localhost:8000
   ```

**✅ Done! Dashboard is running**

---

## For WebSphere/Tomcat WAR Path

### Build It

1. **Requirements:**
   - Maven installed
   - Node.js installed
   - Java 11+ (already on your app server)

2. **Run build script:**
   ```batch
   # Windows:
   BUILD_WAR.bat
   
   # Or Linux/Mac:
   bash BUILD_WAR.sh
   
   # Wait for completion (5-10 minutes)
   ```

3. **Output:**
   ```
   ✅ java/target/was-dashboard.war
   ```

### Deploy to WebSphere

1. **Open WebSphere Admin Console:**
   ```
   http://dmgr-server:9060/ibm/console
   ```

2. **Navigate:**
   ```
   Applications → Application Modules
   → Click "Install New Application"
   ```

3. **Select file:**
   ```
   Browse to: java/target/was-dashboard.war
   Click "Install"
   ```

4. **Save:**
   ```
   Accept all defaults
   Click through
   "Save" at the end
   ```

5. **Start application:**
   ```
   Applications → Enterprise Applications
   → Select "was-dashboard"
   → Click "Start"
   ```

### Deploy to Tomcat

1. **Copy WAR:**
   ```bash
   cp java/target/was-dashboard.war $CATALINA_HOME/webapps/
   ```

2. **Restart Tomcat:**
   ```bash
   $CATALINA_HOME/bin/catalina.sh restart
   ```

3. **Wait for startup:**
   ```
   Tomcat automatically deploys the WAR
   Takes ~30 seconds
   ```

### Access Application

```
WebSphere: http://server:9080/was-dashboard
Tomcat:    http://server:8080/was-dashboard
```

**✅ Done! Dashboard is running**

---

## Configure Your Servers (2 minutes)

### 1. Edit Config File

Open: `config/environment.yml`

### 2. Add Your First Server

```yaml
# At the bottom of the file, add:

clusters:
  - id: my_cluster
    name: My Cluster
    site_id: primary
    members:
      - id: was_server1
        name: WAS-01
        host: was-server1.example.com
        http_port: 9080
        user_added: true
```

### 3. Restart Dashboard

- Stop: Press `Ctrl+C`
- Start: Run the EXE or restart the service

### 4. See Your Server

Open http://localhost:8000 → Should see your server listed!

---

## If Something Is Wrong

| Issue | Solution |
|-------|----------|
| "Cannot reach backend" | Make sure EXE/service is still running |
| "Server not found" | Make sure `user_added: true` is in config |
| "Connection failed" | Check SSH credentials and environment variables |
| Port 8000 already in use | Stop other apps or change port in config |

**See [CONFIG_GUIDE.md](CONFIG_GUIDE.md) for full troubleshooting**

---

## Common Tasks

### Add a WebSphere Cluster

```yaml
clusters:
  - id: app_cluster
    name: Application Cluster
    site_id: primary
    members:
      - id: was_app01
        name: APP-01
        host: app01.example.com
        http_port: 9080
        server_name: AppServer01
        node_name: AppNode01
        user_added: true
      - id: was_app02
        name: APP-02
        host: app02.example.com
        http_port: 9080
        server_name: AppServer02
        node_name: AppNode02
        user_added: true
```

### Add an IIS Server

```yaml
iis_servers:
  - id: iis_web01
    name: IIS Web01
    host: iis-web01.example.com
    site_id: primary
    winrm_username: DOMAIN\iisadmin
    winrm_password_env: IIS_PASSWORD
    user_added: true
```

### Add an ODR Server

```yaml
odr_servers:
  - id: odr_primary
    name: Primary ODR
    host: odr.example.com
    http_port: 9080
    site_id: primary
    user_added: true
```

### Create a Second Site (DR)

```yaml
sites:
  - id: prod
    name: Production
    location: DC1
    is_primary: true
    color: '#1e40af'
  - id: dr
    name: Disaster Recovery
    location: DC2
    is_primary: false
    color: '#7c3aed'

# Then add servers with site_id: dr
```

---

## What's Next?

1. **Add more servers** using config file
2. **Check logs** by clicking "Log" button in UI
3. **Automate with API** - See API endpoints
4. **Set up monitoring** - Configure refresh interval
5. **Deploy to production** - Follow DEPLOYMENT_GUIDE.md

---

## Support

- **Configuration help** → See [CONFIG_GUIDE.md](CONFIG_GUIDE.md)
- **Deployment problems** → See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Why something changed** → See [IMPROVEMENTS.md](IMPROVEMENTS.md)
- **All improvements** → See [IMPROVEMENTS.md](IMPROVEMENTS.md)

---

**That's it! You now have a fully functional WebSphere/IIS administration dashboard! 🎉**
