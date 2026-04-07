"""
Loads and validates environment.yml.
All password-like fields are resolved from environment variables.
"""
import os
import yaml
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).parent.parent / "config" / "environment.yml"
_loaded_config: dict | None = None


def load_config(path: str | None = None) -> dict:
    global _loaded_config
    config_file = Path(path) if path else _CONFIG_PATH
    if not config_file.exists():
        raise FileNotFoundError(
            f"Config file not found: {config_file}. "
            "Copy config/environment.yml and fill in your values."
        )
    with open(config_file, "r") as f:
        raw = yaml.safe_load(f)

    # Resolve all *_env references to actual env var values
    raw = _resolve_env_vars(raw)
    _loaded_config = raw
    logger.info("Configuration loaded from %s", config_file)
    return raw


def get_config() -> dict:
    if _loaded_config is None:
        return load_config()
    return _loaded_config


def _resolve_env_vars(obj):
    """Recursively finds keys ending in _env and replaces them with the
    actual environment variable value (key without _env suffix)."""
    if isinstance(obj, dict):
        resolved = {}
        keys_to_resolve = {k[:-4]: v for k, v in obj.items() if k.endswith("_env")}
        for k, v in obj.items():
            if k.endswith("_env"):
                # Keep the _env key for reference, add resolved key
                resolved[k] = v
                real_key = k[:-4]
                env_val = os.environ.get(v, "")
                if not env_val:
                    logger.warning(
                        "Environment variable '%s' (for config key '%s') is not set.", v, real_key
                    )
                resolved[real_key] = env_val
            else:
                resolved[k] = _resolve_env_vars(v)
        return resolved
    elif isinstance(obj, list):
        return [_resolve_env_vars(item) for item in obj]
    return obj


def get_site_map(config: dict) -> dict:
    """Returns {site_id: site_dict} for quick lookup."""
    return {s["id"]: s for s in config.get("sites", [])}
