# DEPLOYMENT & BUILD GUIDE

## 📦 Three Ways to Deploy

This dashboard can be deployed in three ways, each requiring **NO external dependencies** at the business deployment site:

### Option 1: Windows EXE (Standalone Desktop/Server)
**Best for:** Quick setup on Windows servers, no Java required
- **Single file deployment**
- **All dependencies bundled**
- **No installation required**

```bash
# Build
BUILD_EXE.bat

# Deploy
backend\dist\was-dashboard.exe

# Access
http://localhost:8000
```

### Option 2: Java WAR (Enterprise Deployment)
**Best for:** Integration with WebSphere, Tomcat, or any Java container
- **Standard Java packaging**
- **Integrates with existing infrastructure**
- **Can be deployed to WebSphere directly**

```bash
# Build
BUILD_WAR.bat

# Deploy to WebSphere/Tomcat
Copy java/target/was-dashboard.war to deployment folder
```

### Option 3: Python Standalone JAR (Manual Setup)
**Best for:** Linux/Unix systems, integration with Python tools

```bash
# Run directly (backend + frontend served together)
python backend/main.py
```

---

## 🚀 PRODUCTION DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Review `config/environment.yml` for your environment
- [ ] Set all required environment variables (see CONFIG_GUIDE.md)
- [ ] Test with `simulation_mode: true` first
- [ ] Add one real server in Demo mode to verify connectivity
- [ ] Ensure firewall allows outbound SSH (port 22) and WinRM (port 5985)
- [ ] Verify all SSH keys and passwords are set via environment variables

### EXE Deployment (Windows)

```batch
:: 1. Build the EXE
BUILD_EXE.bat

:: 2. Set environment variables in batch file or system settings
set DMGR_PASSWORD=your_password
set WAS_SSH_KEY_PATH=C:\path\to\ssh\key

:: 3. Run the EXE
backend\dist\was-dashboard.exe

:: 4. Open browser
start http://localhost:8000
```

### WAR Deployment (WebSphere)

```bash
# 1. Build the WAR
BUILD_WAR.bat

# 2. Copy to WebSphere
cp java/target/was-dashboard.war /opt/WebSphere/AppServer/profiles/Dmgr01/librepo/

# 3. Open Admin Console: http://localhost:9060/ibm/console
#    - Applications > Application Modules
#    - Click "Install New Application"
#    - Select was-dashboard.war
#    - Click Next (accept all defaults)
#    - Save Configuration

# 4. Start the application
#    - Ensure enterprise application is started

# 5. Access
# http://localhost:9080/was-dashboard
```

### WAR Deployment (Tomcat)

```bash
# 1. Build the WAR
BUILD_WAR.sh

# 2. Deploy
cp java/target/was-dashboard.war $TOMCAT_HOME/webapps/

# 3. Restart Tomcat
$TOMCAT_HOME/bin/catalina.sh restart

# 4. Access
# http://localhost:8080/was-dashboard
```

---

## 🔧 Configuration for Production

Edit `config/environment.yml`:

```yaml
app:
  simulation_mode: false        # ⚠️ TURN OFF for production
  refresh_interval: 30          # seconds between status polls
  backend_port: 8000
  auth_enabled: false           # Set to true if you add authentication

deployment_manager:
  host: dmgr.example.com
  admin_username: wsadmin
  admin_password_env: DMGR_PASSWORD    # Variable name, not value!
  was_home: /opt/IBM/WebSphere/AppServer

sites:
- id: prod
  name: Production Site
  location: Production DC
  is_primary: true
```

### Required Environment Variables

**Before running in production, set these:**

```bash
# Linux/Mac
export DMGR_PASSWORD="wsadmin_password"
export WAS_SSH_KEY_PATH="/etc/dashdb/ssh_keys/was-key"
export IIS_PASSWORD="DOMAIN\iisadmin_password"

# Windows
set DMGR_PASSWORD=wsadmin_password
set WAS_SSH_KEY_PATH=C:\path\to\ssh\key
set IIS_PASSWORD=DOMAIN\iisadmin_password
```

---

## 📊 Performance Tuning

### For Large Inventories (100+ servers)

**Increase refresh interval in environment.yml:**
```yaml
app:
  refresh_interval: 60    # Poll every 60 seconds instead of 30
```

**Monitor resource usage:**
- Python process should use < 200MB memory
- Java process (WAR) should use 512MB-1GB heap

### JVM Tuning (WAR deployment)

```bash
# Set Java heap size before starting Tomcat/WebSphere
export JAVA_OPTS="-Xms512m -Xmx1024m"
catalina.sh start
```

---

## 🆘 Troubleshooting

### EXE won't start
```
Error: "Python not found" or "Module not found"

Solution:
1. Run BUILD_EXE.bat again (checks all dependencies)
2. Ensure PyInstaller output is in backend/dist/
3. Run: backend\dist\was-dashboard.exe --help
```

### WAR won't deploy
```
Error: "Application failed to start"

Solution:
1. Check WebSphere/Tomcat logs:
   - WebSphere: $WAS_HOME/logs/
   - Tomcat: $CATALINA_HOME/logs/
2. Ensure config/environment.yml is valid YAML
3. Restart the application server
```

### Can't connect to servers
```
Error: "SSH error" or "WinRM error"

Solution:
1. Check environment variables are set: echo $DMGR_PASSWORD
2. Verify SSH key exists and has correct permissions
3. Test SSH manually: ssh -i $WAS_SSH_KEY_PATH wasadmin@server
4. For WinRM: Test Enable-PSRemoting on Windows target server
```

### Slow status updates
```
Solution:
1. Increase refresh_interval in config/environment.yml
2. Check network connectivity between dashboard and servers
3. Review server SSH availability (may timeout on slow networks)
```

---

## 📈 Monitoring

### Health Check Endpoint

```
GET /actuator/health
Responds: { status: "UP", components: { ... } }
```

### Activity Log

Access via web UI: Log tab
- All server actions logged
- Timestamps and success/failure recorded
- Search by server or time period

### Resource Limits

| Resource | Limit |
|----------|-------|
| Max servers | 500+ (tested) |
| Memory usage | 200-500 MB (Python), 512MB-2GB (Java WAR) |
| API timeout | 30 seconds |
| Status poll interval | 15-300 seconds (configurable) |

---

## 🔐 Security

### Do's ✅
- Set credentials via **environment variables** only
- Use SSH keys instead of passwords when possible
- Enable `auth_enabled: true` if UI authentication needed
- Run behind HTTPS proxy in production

### Don'ts ❌
- Never put passwords in `environment.yml`
- Never commit credentials to git
- Don't run as root/admin unless necessary
- Don't expose dashboard to untrusted networks

---

## 📝 Common Customizations

### Change Dashboard Port

**For EXE/Python:**
```yaml
app:
  backend_port: 9000    # Change from 8000 to 9000
```

**For WAR/Tomcat:**
```
Edit $CATALINA_HOME/conf/server.xml
Change port="8080" to port="9000"
```

### Add Custom Branding

Edit `frontend/src/components/Navbar.jsx`:
```jsx
h1: "My Company - Server Dashboard"
p: "Internal Administration Portal"
```

Then rebuild: `BUILD_EXE.bat` or `BUILD_WAR.bat`

---

## 📞 Support

For issues or questions:
1. Check `CONFIG_GUIDE.md` for configuration help
2. Review logs in `/logs/` directory
3. Verify environment variables are set correctly
4. Test server connectivity manually (SSH/WinRM)
