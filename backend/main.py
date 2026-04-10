"""
FastAPI entry-point for the WebSphere Admin Dashboard backend.
Start with:  python main.py   or   uvicorn main:app --reload
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import time

from config_loader import load_config
from models import (
    ServerInfo, DashboardStatus, ActionResponse, LogEntry,
    AddServerRequest, SimulationToggleRequest, UpdateDmgrRequest,
    DailyScheduleRequest,
)
from server_manager import ServerManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ── Globals ──────────────────────────────────────────────────────────
_manager: Optional[ServerManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _manager
    config = load_config()
    _manager = ServerManager(config)
    logger.info("Server inventory loaded – %d servers total", len(_manager.get_all_servers()))

    # Immediately do one status pass
    await _manager.refresh_all_statuses()

    # Background polling loop
    poll_task = asyncio.create_task(_poll_loop(_manager))
    yield
    poll_task.cancel()
    try:
        await poll_task
    except asyncio.CancelledError:
        pass


async def _poll_loop(mgr: ServerManager):
    interval = mgr.config.get("app", {}).get("refresh_interval", 30)
    while True:
        await asyncio.sleep(interval)
        try:
            await mgr.run_due_daily_schedules()
            await mgr.refresh_all_statuses()
            logger.debug(f"Status poll complete – {len(mgr.get_all_servers())} servers checked")
        except Exception as exc:
            logger.error(f"Polling error: {exc}", exc_info=True)


# ── App factory ─────────────────────────────────────────────────────
app = FastAPI(
    title="WebSphere Admin Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request, call_next):
    """Log all HTTP requests for debugging"""
    start = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start
        logger.info(f"{request.method} {request.url.path} – {response.status_code} ({duration:.2f}s)")
        return response
    except Exception as exc:
        duration = time.time() - start
        logger.error(f"{request.method} {request.url.path} – Error: {exc} ({duration:.2f}s)")
        raise


def get_manager() -> ServerManager:
    if _manager is None:
        raise HTTPException(status_code=503, detail="Server manager not ready")
    return _manager


# ── API routes ───────────────────────────────────────────────────────

@app.get("/api/status", response_model=DashboardStatus, tags=["Dashboard"])
async def get_dashboard_status(mgr: ServerManager = Depends(get_manager)):
    """Full dashboard payload: all servers with current status."""
    return mgr.get_dashboard_status()


@app.get("/api/servers", response_model=List[ServerInfo], tags=["Servers"])
async def list_servers(mgr: ServerManager = Depends(get_manager)):
    return mgr.get_all_servers()


@app.post("/api/servers/{server_id}/start", response_model=ActionResponse, tags=["Servers"])
async def start_server(server_id: str, mgr: ServerManager = Depends(get_manager)):
    return await mgr.start_server(server_id)


@app.post("/api/servers/{server_id}/stop", response_model=ActionResponse, tags=["Servers"])
async def stop_server(server_id: str, mgr: ServerManager = Depends(get_manager)):
    return await mgr.stop_server(server_id)


@app.post("/api/servers/{server_id}/restart", response_model=ActionResponse, tags=["Servers"])
async def restart_server(server_id: str, mgr: ServerManager = Depends(get_manager)):
    return await mgr.restart_server(server_id)


@app.get("/api/servers/{server_id}/status", tags=["Servers"])
async def server_status(server_id: str, mgr: ServerManager = Depends(get_manager)):
    result = await mgr.check_server_status(server_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@app.post("/api/refresh", tags=["Dashboard"])
async def manual_refresh(mgr: ServerManager = Depends(get_manager)):
    await mgr.refresh_all_statuses()
    return {"message": "Refresh complete", "total": len(mgr.get_all_servers())}


@app.get("/api/logs", response_model=List[LogEntry], tags=["Logs"])
async def get_logs(mgr: ServerManager = Depends(get_manager)):
    return mgr.get_activity_logs()


@app.get("/api/config", tags=["Config"])
async def get_config(mgr: ServerManager = Depends(get_manager)):
    """Returns sanitized config (no passwords)."""
    return mgr.get_sanitized_config()


@app.post("/api/servers/add", response_model=ActionResponse, tags=["Servers"])
async def add_server(req: AddServerRequest, mgr: ServerManager = Depends(get_manager)):
    """Add a new server to environment.yml and reload the inventory live."""
    # Validate input
    is_valid, error_msg = req.is_valid
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    try:
        result = mgr.add_server(req)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        logger.info(f"Server added: {req.id} ({req.type.value})")
        return result
    except Exception as exc:
        logger.error(f"Failed to add server {req.id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add server: {str(exc)}")


@app.get("/api/sites", tags=["Config"])
async def get_sites(mgr: ServerManager = Depends(get_manager)):
    """Return the list of configured sites (for the Add Server form dropdown)."""
    return mgr.config.get("sites", [])


@app.get("/api/clusters/list", tags=["Config"])
async def get_cluster_list(mgr: ServerManager = Depends(get_manager)):
    """Return cluster ids + names (for the Add Server cluster dropdown)."""
    return [{"id": c["id"], "name": c.get("name", c["id"])}
            for c in mgr.config.get("clusters", [])]


@app.patch("/api/settings/simulation", tags=["Config"])
async def toggle_simulation(req: SimulationToggleRequest, mgr: ServerManager = Depends(get_manager)):
    """Turn simulation mode on or off and persist to environment.yml."""
    mgr.set_simulation_mode(req.enabled)
    return {"success": True, "simulation_mode": req.enabled,
            "message": f"Simulation mode {'enabled' if req.enabled else 'disabled'}"}


@app.patch("/api/settings/dmgr", tags=["Config"])
async def update_dmgr(req: UpdateDmgrRequest, mgr: ServerManager = Depends(get_manager)):
    """Persist Deployment Manager connection details to environment.yml."""
    settings = req.model_dump(exclude_none=True)
    mgr.update_dmgr_settings(settings)
    return {"success": True, "message": "DMGR settings saved"}


@app.patch("/api/servers/{server_id}/daily-schedule", tags=["Servers"])
async def set_daily_schedule(server_id: str, req: DailyScheduleRequest,
                             mgr: ServerManager = Depends(get_manager)):
    # Validate server exists
    if server_id not in {s.id for s in mgr.get_all_servers()}:
        raise HTTPException(status_code=404, detail=f"Server '{server_id}' not found")
    """Set a daily start/stop/restart schedule for a server (persistent in YAML)."""
    result = mgr.set_daily_schedule(server_id, req.model_dump())
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result


@app.get("/health", tags=["Health"])
async def health():
    from datetime import datetime, timezone
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ── Serve built React frontend ───────────────────────────────────────
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        index = _frontend_dist / "index.html"
        return FileResponse(str(index))


# ── Entry-point ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
