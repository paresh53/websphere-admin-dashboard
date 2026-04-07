"""
IIS management via WinRM (PowerShell remoting).

Falls back to TCP port-check for status when WinRM is not available.
"""
import logging
from typing import Tuple
from websphere_client import check_port

logger = logging.getLogger(__name__)

try:
    import winrm
    WINRM_AVAILABLE = True
except ImportError:
    WINRM_AVAILABLE = False
    logger.warning("pywinrm not installed – IIS management disabled. Run: pip install pywinrm")


def _get_protocol(server: dict):
    """Create a pywinrm Protocol object from server config."""
    use_ssl = server.get("winrm_use_ssl", False)
    scheme = "https" if use_ssl else "http"
    port = server.get("winrm_port", 5985)
    endpoint = f"{scheme}://{server['host']}:{port}/wsman"
    return winrm.Protocol(
        endpoint=endpoint,
        transport="ntlm",
        username=server.get("winrm_username", ""),
        password=server.get("winrm_password", ""),
        server_cert_validation="ignore",
    )


def _run_ps(server: dict, script: str, timeout: int = 60) -> Tuple[int, str, str]:
    """Run a PowerShell script via WinRM. Returns (rc, stdout, stderr)."""
    proto = _get_protocol(server)
    shell_id = proto.open_shell()
    try:
        command_id = proto.run_command(
            shell_id,
            "powershell",
            ["-NonInteractive", "-NoProfile", "-Command", script],
        )
        stdout, stderr, rc = proto.get_command_output(shell_id, command_id)
        return rc, stdout.decode(errors="replace"), stderr.decode(errors="replace")
    finally:
        proto.cleanup_command(shell_id, command_id)  # type: ignore[possibly-undefined]
        proto.close_shell(shell_id)


# ── Public API ────────────────────────────────────────────────────

def get_server_status(server: dict) -> Tuple[str, str]:
    """
    Check IIS server status. Returns (status, message).
    Tries WinRM first; falls back to TCP port 80/443.
    """
    if not WINRM_AVAILABLE:
        # Fallback: TCP port check on 80
        host = server.get("host", "")
        if check_port(host, 80):
            return "running", "Port 80 open (WinRM unavailable – limited check)"
        if check_port(host, 443):
            return "running", "Port 443 open (WinRM unavailable – limited check)"
        return "unknown", "pywinrm not installed; TCP check inconclusive"

    ps_script = """
Import-Module WebAdministration -ErrorAction SilentlyContinue
$results = @()
Get-Website | ForEach-Object { $results += "$($_.Name)=$($_.State)" }
$results -join ','
"""
    try:
        rc, stdout, stderr = _run_ps(server, ps_script)
        if rc == 0:
            output = stdout.strip()
            if "Started" in output:
                return "running", f"IIS sites: {output}"
            if "Stopped" in output:
                return "stopped", f"IIS sites: {output}"
            return "unknown", f"IIS state: {output}"
        return "unknown", f"WinRM rc={rc}: {stderr[:200]}"
    except Exception as exc:
        logger.warning("IIS WinRM check failed for %s: %s", server.get("host"), exc)
        # TCP fallback
        host = server.get("host", "")
        if check_port(host, 80) or check_port(host, 443):
            return "running", f"WinRM failed ({exc}); TCP port open"
        return "unknown", f"WinRM error: {exc}"


def start_server(server: dict) -> Tuple[bool, str]:
    """Start all configured IIS sites and app pools."""
    if not WINRM_AVAILABLE:
        return False, "pywinrm not installed – cannot start IIS remotely"

    sites = server.get("iis_sites", [])
    ps_lines = ["Import-Module WebAdministration -ErrorAction SilentlyContinue"]
    for site in sites:
        site_name = site.get("name", "Default Web Site")
        ps_lines.append(f'Start-WebSite -Name "{site_name}" -ErrorAction SilentlyContinue')
        for pool in site.get("app_pools", []):
            ps_lines.append(f'Start-WebAppPool -Name "{pool}" -ErrorAction SilentlyContinue')
    ps_lines.append('Write-Output "Done"')

    try:
        rc, stdout, stderr = _run_ps(server, "\n".join(ps_lines), timeout=60)
        if rc == 0:
            return True, f"IIS sites started on {server['host']}"
        return False, f"IIS start rc={rc}: {stderr[:300]}"
    except Exception as exc:
        logger.exception("IIS start failed for %s", server.get("host"))
        return False, f"WinRM error: {exc}"


def stop_server(server: dict) -> Tuple[bool, str]:
    """Stop all configured IIS sites and app pools."""
    if not WINRM_AVAILABLE:
        return False, "pywinrm not installed – cannot stop IIS remotely"

    sites = server.get("iis_sites", [])
    ps_lines = ["Import-Module WebAdministration -ErrorAction SilentlyContinue"]
    for site in sites:
        site_name = site.get("name", "Default Web Site")
        ps_lines.append(f'Stop-WebSite -Name "{site_name}" -ErrorAction SilentlyContinue')
        for pool in site.get("app_pools", []):
            ps_lines.append(f'Stop-WebAppPool -Name "{pool}" -ErrorAction SilentlyContinue')
    ps_lines.append('Write-Output "Done"')

    try:
        rc, stdout, stderr = _run_ps(server, "\n".join(ps_lines), timeout=60)
        if rc == 0:
            return True, f"IIS sites stopped on {server['host']}"
        return False, f"IIS stop rc={rc}: {stderr[:300]}"
    except Exception as exc:
        logger.exception("IIS stop failed for %s", server.get("host"))
        return False, f"WinRM error: {exc}"


def restart_server(server: dict) -> Tuple[bool, str]:
    """Perform an iisreset on the target server."""
    if not WINRM_AVAILABLE:
        return False, "pywinrm not installed – cannot restart IIS remotely"

    try:
        rc, stdout, stderr = _run_ps(server, "iisreset /restart", timeout=120)
        if rc == 0:
            return True, f"IIS restarted on {server['host']}"
        return False, f"iisreset rc={rc}: {stderr[:300]}"
    except Exception as exc:
        logger.exception("IIS restart failed for %s", server.get("host"))
        return False, f"WinRM error: {exc}"
