# ─────────────────────────────────────────────
#  Pydantic data models for the dashboard API
# ─────────────────────────────────────────────
from pydantic import BaseModel
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


class ActionResponse(BaseModel):
    success: bool
    message: str
    server_id: str
    action: str


class LogEntry(BaseModel):
    timestamp: str
    server_id: str
    server_name: str
    action: str
    success: bool
    message: str
    user: str = "dashboard"
