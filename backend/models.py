# ─────────────────────────────────────────────
#  Pydantic data models for the dashboard API
# ─────────────────────────────────────────────
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum


class ServerStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    STARTING = "starting"
    STOPPING = "stopping"
    UNKNOWN = "unknown"
    ERROR = "error"


class ServerType(str, Enum):
    WEBSPHERE = "websphere"
    ODR = "odr"
    IIS = "iis"
    CPE = "cpe"
    ICN = "icn"


class ServerInfo(BaseModel):
    id: str
    name: str
    type: ServerType
    host: str
    site_id: str
    site_name: str
    site_color: str = "#1e40af"
    is_primary_site: bool = True
    status: ServerStatus = ServerStatus.UNKNOWN
    http_port: Optional[int] = None
    https_port: Optional[int] = None
    admin_url: Optional[str] = None
    node_name: Optional[str] = None
    server_name: Optional[str] = None
    last_checked: Optional[str] = None
    message: Optional[str] = None
    cluster_name: Optional[str] = None
    auto_schedule_enabled: bool = False
    auto_schedule_action: Optional[str] = None
    auto_schedule_time: Optional[str] = None


class SiteInfo(BaseModel):
    id: str
    name: str
    location: str
    is_primary: bool
    color: str
    server_count: int = 0
    running_count: int = 0
    stopped_count: int = 0


class DashboardStatus(BaseModel):
    sites: List[SiteInfo]
    clusters: List[Any]
    odr_servers: List[ServerInfo]
    iis_servers: List[ServerInfo]
    content_platform: List[ServerInfo]
    content_navigator: List[ServerInfo]
    total_servers: int
    running_count: int
    stopped_count: int
    unknown_count: int
    last_refresh: str
    simulation_mode: bool = True
    is_first_run: bool = False


class ActionResponse(BaseModel):
    success: bool
    message: str
    server_id: str
    action: str


class SimulationToggleRequest(BaseModel):
    """Payload for PATCH /api/settings/simulation"""
    enabled: bool


class UpdateDmgrRequest(BaseModel):
    """Payload for PATCH /api/settings/dmgr"""
    host: str
    cell_name: str
    admin_username: Optional[str] = 'wsadmin'
    admin_password_env: Optional[str] = 'DMGR_PASSWORD'
    was_home: Optional[str] = '/opt/IBM/WebSphere/AppServer'
    profile_name: Optional[str] = 'Dmgr01'
    ssh_username: Optional[str] = 'wasadmin'
    ssh_key_env: Optional[str] = 'WAS_SSH_KEY_PATH'
    soap_port: Optional[int] = 8879
    admin_https_port: Optional[int] = 9043


class LogEntry(BaseModel):
    timestamp: str
    server_id: str
    server_name: str
    action: str
    success: bool
    message: str
    user: str = "dashboard"


class AddServerRequest(BaseModel):
    """Payload for POST /api/servers/add"""
    # core identity
    id: str = Field(..., description="Unique server ID, e.g. cp05")
    name: str = Field(..., description="Display name shown on the card")
    type: ServerType = Field(..., description="Server type")
    site_id: str = Field(..., description="Must match a site id in config")
    host: str = Field(..., description="Hostname or IP address")

    # ports
    http_port: Optional[int] = 9080
    https_port: Optional[int] = 9443

    # WAS / ODR / CPE / ICN fields
    server_name: Optional[str] = None
    node_name: Optional[str] = None
    was_home: Optional[str] = "/opt/IBM/WebSphere/AppServer"
    profile_name: Optional[str] = "AppSrv01"
    ssh_username: Optional[str] = "wasadmin"
    ssh_key_env: Optional[str] = "WAS_SSH_KEY_PATH"
    admin_username: Optional[str] = "wsadmin"
    admin_password_env: Optional[str] = "DMGR_PASSWORD"
    admin_url: Optional[str] = None

    # Cluster membership (WAS only)
    cluster_id: Optional[str] = None   # existing cluster id to add member to

    # IIS-specific
    winrm_port: Optional[int] = 5985
    winrm_use_ssl: Optional[bool] = False
    winrm_username: Optional[str] = None
    winrm_password_env: Optional[str] = None


class DailyScheduleRequest(BaseModel):
    """Payload for per-server daily auto schedule."""
    enabled: bool = True
    action: str = Field(..., description="start | stop | restart")
    time: str = Field(..., description="24-hour HH:MM, e.g. 17:00")
