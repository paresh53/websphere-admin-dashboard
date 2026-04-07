"""
ServerManager orchestrates all server operations:
  - Builds the server inventory from config
  - Caches status results
  - Dispatches start/stop/restart to the correct client
  - Maintains an in-memory activity log
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from models import (
    ServerInfo, ServerType, ServerStatus,
    SiteInfo, DashboardStatus, ActionResponse, LogEntry
)

logger = logging.getLogger(__name__)

_MAX_LOG_ENTRIES = 100


class ServerManager:
    def __init__(self, config: dict):
        self.config = config
        self._servers: dict[str, ServerInfo] = {}
        self._server_raw: dict[str, dict] = {}   # raw config dict per server
        self._activity_log: List[LogEntry] = []
        self._simulation = config.get("app", {}).get("simulation_mode", False)
        self._build_inventory()

    # ── Inventory ────────────────────────────────────────────────────

    def _site_info(self, site_id: str) -> tuple:
        """Return (site_name, site_color, is_primary) for a site_id."""
        for s in self.config.get("sites", []):
            if s["id"] == site_id:
                return s.get("name", site_id), s.get("color", "#1e40af"), s.get("is_primary", False)
        return site_id, "#1e40af", False

    def _build_inventory(self):
        """Populate _servers dict from config."""

        # WAS cluster members
        for cluster in self.config.get("clusters", []):
            cluster_name = cluster.get("name", "Cluster")
            site_id = cluster.get("site_id", "primary")
            site_name, color, is_primary = self._site_info(site_id)
            for member in cluster.get("members", []):
                srv_id = member["id"]
                raw = {**cluster, **member}   # member overrides cluster-level keys
                info = ServerInfo(
                    id=srv_id,
                    name=member.get("name", member.get("server_name", srv_id)),
                    type=ServerType.WEBSPHERE,
                    host=member.get("host", ""),
                    site_id=site_id,
                    site_name=site_name,
                    site_color=color,
                    is_primary_site=is_primary,
                    http_port=member.get("http_port"),
                    https_port=member.get("https_port"),
                    node_name=member.get("node_name"),
                    server_name=member.get("server_name"),
                    cluster_name=cluster_name,
                )
                self._servers[srv_id] = info
                self._server_raw[srv_id] = raw

        # ODR servers
        for odr in self.config.get("odr_servers", []):
            srv_id = odr["id"]
            site_name, color, is_primary = self._site_info(odr.get("site_id", "primary"))
            info = ServerInfo(
                id=srv_id,
                name=odr.get("name", srv_id),
                type=ServerType.ODR,
                host=odr.get("host", ""),
                site_id=odr.get("site_id", "primary"),
                site_name=site_name,
                site_color=color,
                is_primary_site=is_primary,
                http_port=odr.get("http_port"),
                https_port=odr.get("https_port"),
                node_name=odr.get("node_name"),
                server_name=odr.get("server_name"),
            )
            self._servers[srv_id] = info
            self._server_raw[srv_id] = odr

        # IIS servers
        for iis in self.config.get("iis_servers", []):
            srv_id = iis["id"]
            site_name, color, is_primary = self._site_info(iis.get("site_id", "primary"))
            info = ServerInfo(
                id=srv_id,
                name=iis.get("name", srv_id),
                type=ServerType.IIS,
                host=iis.get("host", ""),
                site_id=iis.get("site_id", "primary"),
                site_name=site_name,
                site_color=color,
                is_primary_site=is_primary,
                http_port=80,
                https_port=443,
            )
            self._servers[srv_id] = info
            self._server_raw[srv_id] = iis

        # CPE servers
        for cpe in self.config.get("content_platform", []):
            srv_id = cpe["id"]
            site_name, color, is_primary = self._site_info(cpe.get("site_id", "primary"))
            info = ServerInfo(
                id=srv_id,
                name=cpe.get("name", srv_id),
                type=ServerType.CPE,
                host=cpe.get("host", ""),
                site_id=cpe.get("site_id", "primary"),
                site_name=site_name,
                site_color=color,
                is_primary_site=is_primary,
                http_port=cpe.get("http_port"),
                https_port=cpe.get("https_port"),
                admin_url=cpe.get("admin_url"),
                node_name=cpe.get("node_name"),
                server_name=cpe.get("server_name"),
            )
            self._servers[srv_id] = info
            self._server_raw[srv_id] = cpe

        # ICN servers
        for icn in self.config.get("content_navigator", []):
            srv_id = icn["id"]
            site_name, color, is_primary = self._site_info(icn.get("site_id", "primary"))
            info = ServerInfo(
                id=srv_id,
                name=icn.get("name", srv_id),
                type=ServerType.ICN,
                host=icn.get("host", ""),
                site_id=icn.get("site_id", "primary"),
                site_name=site_name,
                site_color=color,
                is_primary_site=is_primary,
                http_port=icn.get("http_port"),
                https_port=icn.get("https_port"),
                admin_url=icn.get("admin_url"),
                node_name=icn.get("node_name"),
                server_name=icn.get("server_name"),
            )
            self._servers[srv_id] = info
            self._server_raw[srv_id] = icn

        logger.info("Inventory built: %d servers", len(self._servers))

    # ── Status checking ──────────────────────────────────────────────

    async def check_server_status(self, server_id: str) -> dict:
        info = self._servers.get(server_id)
        if not info:
            return {"error": f"Server {server_id} not found"}

        status, message = await asyncio.get_event_loop().run_in_executor(
            None, self._sync_check_status, server_id
        )
        now = datetime.now(timezone.utc).isoformat()
        info.status = ServerStatus(status)
        info.message = message
        info.last_checked = now
        return {"id": server_id, "status": status, "message": message, "last_checked": now}

    def _sync_check_status(self, server_id: str) -> tuple:
        if self._simulation:
            return self._simulate_status(server_id)

        info = self._servers[server_id]
        raw = self._server_raw[server_id]

        if info.type == ServerType.IIS:
            from iis_client import get_server_status
            return get_server_status(raw)
        else:
            from websphere_client import get_server_status
            return get_server_status(raw)

    # Persistent simulation state so statuses don't flicker on every poll
    _sim_states: dict = {}

    def _simulate_status(self, server_id: str) -> tuple:
        """Return a deterministic but realistic fake status for demo/testing.

        Primary-site servers:   mostly RUNNING (one randomly STOPPED to show alerts)
        DR-site servers:        STOPPED by default (standby, realistic HA/DR scenario)
        """
        if server_id in self._sim_states:
            return self._sim_states[server_id]

        info = self._servers.get(server_id)
        if not info:
            result = ("unknown", "Server not found (simulated)")
        elif not info.is_primary_site:
            # DR site: servers are in standby (stopped)
            result = ("stopped", "DR standby – not active (simulated)")
        else:
            # Primary site: seed from server_id so result is consistent across restarts
            # Use a hash so different servers get different outcomes
            seed = sum(ord(c) for c in server_id)
            # ~85% running, ~15% stopped to show at least one alert on the dashboard
            if seed % 7 == 0:
                result = ("stopped", "Port closed – check server (simulated)")
            else:
                result = ("running", "Port 9080 open (simulated)")

        self._sim_states[server_id] = result
        return result

    async def refresh_all_statuses(self):
        tasks = [self.check_server_status(sid) for sid in self._servers]
        await asyncio.gather(*tasks, return_exceptions=True)

    # ── Actions ──────────────────────────────────────────────────────

    async def start_server(self, server_id: str) -> ActionResponse:
        return await self._perform_action(server_id, "start")

    async def stop_server(self, server_id: str) -> ActionResponse:
        return await self._perform_action(server_id, "stop")

    async def restart_server(self, server_id: str) -> ActionResponse:
        return await self._perform_action(server_id, "restart")

    async def _perform_action(self, server_id: str, action: str) -> ActionResponse:
        info = self._servers.get(server_id)
        if not info:
            return ActionResponse(success=False, message=f"Server {server_id} not found",
                                  server_id=server_id, action=action)

        if self._simulation:
            ok, msg = True, f"[SIMULATION] {action} called on {info.name}"
        else:
            ok, msg = await asyncio.get_event_loop().run_in_executor(
                None, self._sync_action, server_id, action
            )

        # Update status cache optimistically
        if ok:
            status_map = {"start": ServerStatus.RUNNING, "stop": ServerStatus.STOPPED,
                          "restart": ServerStatus.RUNNING}
            info.status = status_map.get(action, ServerStatus.UNKNOWN)

        self._log(server_id, info.name, action, ok, msg)
        return ActionResponse(success=ok, message=msg, server_id=server_id, action=action)

    def _sync_action(self, server_id: str, action: str) -> tuple:
        info = self._servers[server_id]
        raw = self._server_raw[server_id]

        if info.type == ServerType.IIS:
            import iis_client as client
        else:
            import websphere_client as client

        fn = getattr(client, f"{action}_server", None)
        if fn is None:
            return False, f"Action '{action}' not supported"
        return fn(raw)

    # ── Query helpers ────────────────────────────────────────────────

    def get_all_servers(self) -> List[ServerInfo]:
        return list(self._servers.values())

    def get_dashboard_status(self) -> DashboardStatus:
        servers = list(self._servers.values())
        running = sum(1 for s in servers if s.status == ServerStatus.RUNNING)
        stopped = sum(1 for s in servers if s.status == ServerStatus.STOPPED)
        unknown = sum(1 for s in servers if s.status in (ServerStatus.UNKNOWN, ServerStatus.ERROR))

        # Build site summaries
        site_summaries: List[SiteInfo] = []
        for site_cfg in self.config.get("sites", []):
            sid = site_cfg["id"]
            site_servers = [s for s in servers if s.site_id == sid]
            site_summaries.append(SiteInfo(
                id=sid,
                name=site_cfg.get("name", sid),
                location=site_cfg.get("location", ""),
                is_primary=site_cfg.get("is_primary", False),
                color=site_cfg.get("color", "#1e40af"),
                server_count=len(site_servers),
                running_count=sum(1 for s in site_servers if s.status == ServerStatus.RUNNING),
                stopped_count=sum(1 for s in site_servers if s.status == ServerStatus.STOPPED),
            ))

        # Group servers by type
        def filter_type(t): return [s for s in servers if s.type == t]

        # Build cluster groups
        cluster_groups = []
        for cluster in self.config.get("clusters", []):
            member_ids = [m["id"] for m in cluster.get("members", [])]
            members = [self._servers[mid] for mid in member_ids if mid in self._servers]
            cluster_groups.append({
                "id": cluster["id"],
                "name": cluster["name"],
                "site_id": cluster.get("site_id"),
                "members": [m.model_dump() for m in members],
            })

        return DashboardStatus(
            sites=site_summaries,
            clusters=cluster_groups,
            odr_servers=filter_type(ServerType.ODR),
            iis_servers=filter_type(ServerType.IIS),
            content_platform=filter_type(ServerType.CPE),
            content_navigator=filter_type(ServerType.ICN),
            total_servers=len(servers),
            running_count=running,
            stopped_count=stopped,
            unknown_count=unknown,
            last_refresh=datetime.now(timezone.utc).isoformat(),
        )

    def get_sanitized_config(self) -> dict:
        """Return config with passwords/keys stripped."""
        import copy, re
        cfg = copy.deepcopy(self.config)
        sensitive = re.compile(r"(password|key|secret|token)", re.I)

        def scrub(obj):
            if isinstance(obj, dict):
                return {k: "***" if sensitive.search(k) and not k.endswith("_env") else scrub(v)
                        for k, v in obj.items()}
            if isinstance(obj, list):
                return [scrub(i) for i in obj]
            return obj

        return scrub(cfg)

    def get_activity_logs(self) -> List[LogEntry]:
        return self._activity_log

    # ── Add server ───────────────────────────────────────────────────

    def add_server(self, req) -> "ActionResponse":
        """Append a new server to environment.yml and hot-reload the inventory."""
        import yaml, re
        from pathlib import Path

        # Validate: id must be unique
        if req.id in self._servers:
            return ActionResponse(
                success=False,
                message=f"Server id '{req.id}' already exists.",
                server_id=req.id,
                action="add",
            )

        # Validate: site_id must exist
        known_sites = {s["id"] for s in self.config.get("sites", [])}
        if req.site_id not in known_sites:
            return ActionResponse(
                success=False,
                message=f"Site '{req.site_id}' is not defined in config. Add it under 'sites' first.",
                server_id=req.id,
                action="add",
            )

        # Build the new config dict entry
        srv_type = req.type.value  # e.g. "websphere"

        base = {
            "id": req.id,
            "name": req.name,
            "site_id": req.site_id,
            "host": req.host,
            "http_port": req.http_port,
            "https_port": req.https_port,
        }

        was_fields = {
            "server_name": req.server_name or req.name,
            "node_name": req.node_name or (req.id.upper() + "Node"),
            "was_home": req.was_home,
            "profile_name": req.profile_name,
            "ssh_username": req.ssh_username,
            "ssh_key_env": req.ssh_key_env,
            "admin_username": req.admin_username,
            "admin_password_env": req.admin_password_env,
        }

        if srv_type == "iis":
            entry = {**base,
                     "winrm_port": req.winrm_port,
                     "winrm_use_ssl": req.winrm_use_ssl,
                     "winrm_username": req.winrm_username or "DOMAIN\\iisadmin",
                     "winrm_password_env": req.winrm_password_env or f"IIS_{req.id.upper()}_PASSWORD",
                     "iis_sites": [{"name": "Default Web Site", "app_pools": ["DefaultAppPool"]}]}
        elif srv_type in ("cpe", "icn"):
            entry = {**base, **was_fields,
                     "admin_url": req.admin_url or f"http://{req.host}:{req.http_port}/{'acce' if srv_type == 'cpe' else 'navigator'}"}
        elif srv_type in ("websphere", "odr"):
            entry = {**base, **was_fields}
        else:
            entry = {**base}

        # Write to YAML
        config_path = self._find_config_path()
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                raw = f.read()

            # Determine target YAML section key
            section_map = {
                "websphere": "clusters",
                "odr": "odr_servers",
                "iis": "iis_servers",
                "cpe": "content_platform",
                "icn": "content_navigator",
            }
            section = section_map.get(srv_type, "odr_servers")

            config_data = yaml.safe_load(raw)

            if srv_type == "websphere" and req.cluster_id:
                # Add as a cluster member
                added = False
                for cluster in config_data.get("clusters", []):
                    if cluster["id"] == req.cluster_id:
                        member_entry = {k: v for k, v in entry.items()
                                        if k not in ("was_home", "profile_name", "ssh_username",
                                                     "ssh_key_env", "admin_username", "admin_password_env")}
                        cluster.setdefault("members", []).append(member_entry)
                        added = True
                        break
                if not added:
                    return ActionResponse(
                        success=False,
                        message=f"Cluster '{req.cluster_id}' not found.",
                        server_id=req.id,
                        action="add",
                    )
            else:
                config_data.setdefault(section, []).append(entry)

            # Write back with block style
            with open(config_path, "w", encoding="utf-8") as f:
                yaml.dump(config_data, f, default_flow_style=False,
                          allow_unicode=True, sort_keys=False)

        except Exception as exc:
            return ActionResponse(
                success=False,
                message=f"Failed to write config: {exc}",
                server_id=req.id,
                action="add",
            )

        # Hot-reload: build ServerInfo and add to running inventory
        site_name, color, is_primary = self._site_info(req.site_id)
        type_enum = ServerType(srv_type)

        info = ServerInfo(
            id=req.id,
            name=req.name,
            type=type_enum,
            host=req.host,
            site_id=req.site_id,
            site_name=site_name,
            site_color=color,
            is_primary_site=is_primary,
            http_port=req.http_port,
            https_port=req.https_port,
            admin_url=entry.get("admin_url"),
            node_name=entry.get("node_name"),
            server_name=entry.get("server_name"),
            cluster_name=None,
        )

        # If added to a cluster, update its member list in config cache
        if srv_type == "websphere" and req.cluster_id:
            for cluster in self.config.get("clusters", []):
                if cluster["id"] == req.cluster_id:
                    info.cluster_name = cluster.get("name")
                    cluster.setdefault("members", []).append({**entry, "id": req.id})
                    break
        else:
            self.config.setdefault(section, []).append(entry)

        self._servers[req.id] = info
        self._server_raw[req.id] = entry

        # Set initial simulated status
        if self._simulation:
            self._sim_states[req.id] = (
                ("running", "Port open (simulated)")
                if is_primary
                else ("stopped", "DR standby – not active (simulated)")
            )
            info.status = ServerStatus("running" if is_primary else "stopped")

        self._log(req.id, req.name, "add", True,
                  f"Server '{req.name}' added to {section} and saved to config.")

        return ActionResponse(
            success=True,
            message=f"Server '{req.name}' added successfully.",
            server_id=req.id,
            action="add",
        )

    def _find_config_path(self) -> str:
        """Find environment.yml path."""
        import os
        from pathlib import Path
        candidates = [
            os.getenv("WAS_DASHBOARD_CONFIG", ""),
            Path(__file__).parent.parent / "config" / "environment.yml",
            Path(__file__).parent / "config" / "environment.yml",
            "config/environment.yml",
        ]
        for p in candidates:
            if p and Path(p).exists():
                return str(p)
        raise FileNotFoundError("Cannot locate environment.yml")

    # ── Logging ──────────────────────────────────────────────────────

    def _log(self, server_id: str, server_name: str, action: str, success: bool, message: str):
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            server_id=server_id,
            server_name=server_name,
            action=action,
            success=success,
            message=message,
        )
        self._activity_log.insert(0, entry)
        if len(self._activity_log) > _MAX_LOG_ENTRIES:
            self._activity_log.pop()
