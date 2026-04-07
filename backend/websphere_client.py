"""
WebSphere SSH client.

Uses paramiko to SSH into a WAS node and execute:
  - startServer.sh / stopServer.sh  (start/stop)
  - TCP port check                  (status)

All operations are wrapped so they never raise – they return
(success: bool, message: str) tuples.
"""
import socket
import logging
import os
from typing import Tuple

logger = logging.getLogger(__name__)

try:
    import paramiko
    PARAMIKO_AVAILABLE = True
except ImportError:
    PARAMIKO_AVAILABLE = False
    logger.warning("paramiko not installed – SSH management disabled. Run: pip install paramiko")


def check_port(host: str, port: int, timeout: float = 5.0) -> bool:
    """Return True if TCP port is open (server is likely running)."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, socket.timeout):
        return False


def _get_ssh_client(server: dict) -> "paramiko.SSHClient":
    """Build and connect a paramiko SSH client from server config."""
    if not PARAMIKO_AVAILABLE:
        raise RuntimeError("paramiko is not installed")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())  # enterprise network

    key_path = server.get("ssh_key")
    username = server.get("ssh_username", "wasadmin")
    password = server.get("ssh_password", "")
    host = server["host"]

    connect_kwargs = {"username": username, "timeout": 30}
    if key_path and os.path.exists(key_path):
        connect_kwargs["key_filename"] = key_path
    elif password:
        connect_kwargs["password"] = password
    else:
        logger.warning("No SSH credential provided for %s – trying key-based auth", host)

    ssh.connect(host, **connect_kwargs)
    return ssh


def _ssh_exec(server: dict, command: str, timeout: int = 120) -> Tuple[int, str, str]:
    """Execute a command over SSH. Returns (exit_code, stdout, stderr)."""
    ssh = _get_ssh_client(server)
    try:
        _, stdout, stderr = ssh.exec_command(command, timeout=timeout)
        exit_code = stdout.channel.recv_exit_status()
        return exit_code, stdout.read().decode(), stderr.read().decode()
    finally:
        ssh.close()


# ── Public API ────────────────────────────────────────────────────

def get_server_status(server: dict) -> Tuple[str, str]:
    """
    Returns (status_string, message).
    status_string: 'running' | 'stopped' | 'unknown'
    """
    http_port = server.get("http_port")
    https_port = server.get("https_port")
    host = server.get("host", "")

    if not host:
        return "unknown", "No host configured"

    # Prefer HTTP port check; fall back to HTTPS
    for port in filter(None, [http_port, https_port]):
        if check_port(host, port):
            return "running", f"Port {port} is open on {host}"

    # If no port configured at all, report unknown
    if not http_port and not https_port:
        return "unknown", "No port configured for status check"

    return "stopped", f"No open port found on {host}"


def start_server(server: dict) -> Tuple[bool, str]:
    """SSH to the node and run startServer.sh."""
    if not PARAMIKO_AVAILABLE:
        return False, "paramiko not installed – cannot manage servers via SSH"

    was_home = server.get("was_home", "/opt/IBM/WebSphere/AppServer")
    profile = server.get("profile_name", "AppSrv01")
    server_name = server.get("server_name", "")
    if not server_name:
        return False, "server_name not configured"

    cmd = f"{was_home}/profiles/{profile}/bin/startServer.sh {server_name}"
    logger.info("Starting WAS server: %s on %s", server_name, server["host"])
    try:
        rc, stdout, stderr = _ssh_exec(server, cmd, timeout=180)
        output = stdout + stderr
        if rc == 0 or "ADMU3000I" in output or "open for e-business" in output:
            return True, f"Server {server_name} started successfully"
        return False, f"startServer returned {rc}: {output[:500]}"
    except Exception as exc:
        logger.exception("start_server failed for %s", server_name)
        return False, f"SSH error: {exc}"


def stop_server(server: dict) -> Tuple[bool, str]:
    """SSH to the node and run stopServer.sh."""
    if not PARAMIKO_AVAILABLE:
        return False, "paramiko not installed – cannot manage servers via SSH"

    was_home = server.get("was_home", "/opt/IBM/WebSphere/AppServer")
    profile = server.get("profile_name", "AppSrv01")
    server_name = server.get("server_name", "")
    admin_user = server.get("admin_username", "wsadmin")
    admin_pass = server.get("admin_password", "")

    if not server_name:
        return False, "server_name not configured"

    auth_flags = ""
    if admin_pass:
        auth_flags = f"-username {admin_user} -password {admin_pass}"

    cmd = f"{was_home}/profiles/{profile}/bin/stopServer.sh {server_name} {auth_flags}"
    logger.info("Stopping WAS server: %s on %s", server_name, server["host"])
    try:
        rc, stdout, stderr = _ssh_exec(server, cmd, timeout=180)
        output = stdout + stderr
        if rc == 0 or "ADMU4000I" in output or "stop completed" in output.lower():
            return True, f"Server {server_name} stopped successfully"
        return False, f"stopServer returned {rc}: {output[:500]}"
    except Exception as exc:
        logger.exception("stop_server failed for %s", server_name)
        return False, f"SSH error: {exc}"


def restart_server(server: dict) -> Tuple[bool, str]:
    """Stop then start."""
    ok, msg = stop_server(server)
    if not ok:
        return False, f"Stop failed: {msg}"
    ok, msg = start_server(server)
    if not ok:
        return False, f"Start failed: {msg}"
    return True, f"Server {server.get('server_name')} restarted successfully"
