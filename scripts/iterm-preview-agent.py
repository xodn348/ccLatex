#!/usr/bin/env python3
"""iTerm2 AutoLaunch daemon for cclatex image previews.

Install target:
  ~/Library/Application Support/iTerm2/Scripts/AutoLaunch/cclatex_preview_agent.py

The daemon tails JSONL requests written by scripts/iterm-preview-agent-send.mjs
and injects iTerm2 inline-image escape sequences into the currently active iTerm2
session. Because injection happens inside iTerm2, it bypasses Codex stdout
capture and terminal/TTY sandbox restrictions.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from pathlib import Path
from typing import Any

import iterm2

REQUEST_FILE = Path(
    os.environ.get(
        "CCLATEX_ITERM_PREVIEW_JSONL",
        str(Path.home() / "Library/Application Support/cclatex/preview.jsonl"),
    )
)
POLL_INTERVAL_SECONDS = 0.20
MAX_IMAGE_BYTES = 12 * 1024 * 1024
CHUNK_SIZE = 192


def _read_new_lines(path: Path, offset: int) -> tuple[list[str], int]:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.touch()
        return [], 0

    size = path.stat().st_size
    if size < offset:
        offset = 0

    with path.open("r", encoding="utf-8") as handle:
        handle.seek(offset)
        data = handle.read()
        new_offset = handle.tell()

    return data.splitlines(), new_offset


def _inline_image_payload(image_path: Path, *, name: str | None = None) -> bytes:
    data = image_path.read_bytes()
    if not data:
        raise ValueError(f"image is empty: {image_path}")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError(f"image is too large for preview: {len(data)} bytes > {MAX_IMAGE_BYTES}")

    encoded = base64.b64encode(data).decode("ascii")
    args = ["inline=1", "preserveAspectRatio=1", f"size={len(data)}"]
    if name:
        args.append("name=" + base64.b64encode(name.encode("utf-8")).decode("ascii"))

    # Use iTerm2 3.5+ MultipartFile to keep individual OSC sequences small.
    parts = [f"\x1b]1337;MultipartFile={';'.join(args)}\x07"]
    parts.extend(
        f"\x1b]1337;FilePart={encoded[index:index + CHUNK_SIZE]}\x07"
        for index in range(0, len(encoded), CHUNK_SIZE)
    )
    parts.append("\x1b]1337;FileEnd\x07")
    return "".join(parts).encode("ascii") + b"\n"


def _request_image_path(request: dict[str, Any]) -> Path | None:
    if request.get("type") not in (None, "image"):
        return None
    raw_path = request.get("path")
    if not isinstance(raw_path, str) or not raw_path:
        return None
    return Path(raw_path).expanduser().resolve()


async def _inject_request(app: Any, request: dict[str, Any]) -> None:
    image_path = _request_image_path(request)
    if image_path is None:
        return
    if not image_path.exists():
        print(f"cclatex preview skipped missing image: {image_path}")
        return

    window = app.current_terminal_window
    if window is None or window.current_tab is None or window.current_tab.current_session is None:
        print("cclatex preview skipped: no active iTerm2 session")
        return

    payload = _inline_image_payload(image_path, name=request.get("name") or image_path.name)
    await window.current_tab.current_session.async_inject(payload)
    print(f"cclatex preview injected: {image_path}")


async def main(connection: Any) -> None:
    app = await iterm2.async_get_app(connection)
    REQUEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    REQUEST_FILE.touch(exist_ok=True)
    offset = REQUEST_FILE.stat().st_size
    print(f"cclatex preview agent watching {REQUEST_FILE}")

    while True:
        lines, offset = _read_new_lines(REQUEST_FILE, offset)
        for line in lines:
            if not line.strip():
                continue
            try:
                request = json.loads(line)
                if isinstance(request, dict):
                    await _inject_request(app, request)
            except Exception as exc:  # iTerm2 script console is the only practical log target.
                print(f"cclatex preview request failed: {exc}")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


iterm2.run_forever(main)
