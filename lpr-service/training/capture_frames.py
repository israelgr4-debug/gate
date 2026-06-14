"""Capture JPEG frames from an RTSP stream for labeling.

Usage:
    python capture_frames.py --rtsp rtsp://user:pass@cam/Streaming/Channels/101 \
                             --out captures/raw --fps 1 --max 2000
"""
from __future__ import annotations
import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--rtsp", required=True)
    p.add_argument("--out", default="captures/raw")
    p.add_argument("--fps", type=float, default=1.0)
    p.add_argument("--max", type=int, default=2000, help="stop after N frames")
    p.add_argument("--quality", type=int, default=3, help="ffmpeg -q:v (lower=better)")
    args = p.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    pattern = str(out / "frame_%06d.jpg")

    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", args.rtsp,
        "-vf", f"fps={args.fps}",
        "-q:v", str(args.quality),
        "-frames:v", str(args.max),
        pattern,
    ]
    print("running:", " ".join(cmd))
    t0 = time.time()
    rc = subprocess.call(cmd)
    dur = time.time() - t0
    count = len(list(out.glob("frame_*.jpg")))
    print(f"done rc={rc} frames={count} duration={dur:.1f}s out={out}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
