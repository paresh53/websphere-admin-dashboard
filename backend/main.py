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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from config_loader import load_config
from models import ServerInfo, DashboardStatus, ActionResponse, LogEntry
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
            await mgr.refresh_all_statuses()
        except Exception as exc:
            logger.error("Polling error: %s", exc)


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
    return await mgr.check_server_status(server_id)


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
