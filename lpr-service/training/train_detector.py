"""Fine-tune YOLOv8 on the plate-detection dataset.

Usage:
    python train_detector.py --weights yolov8n.pt --epochs 80 --imgsz 640 \
                             --batch 16 --device 0
The exported best.pt is copied to ../models/plate_detector.pt
"""
from __future__ import annotations
import argparse
import shutil
from pathlib import Path


def main() -> int:
    from ultralytics import YOLO

    p = argparse.ArgumentParser()
    p.add_argument("--weights", default="yolov8n.pt")
    p.add_argument("--data", default="dataset.yaml")
    p.add_argument("--epochs", type=int, default=80)
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--device", default="0")
    p.add_argument("--name", default="plate_detector")
    p.add_argument("--patience", type=int, default=20)
    p.add_argument("--project", default="runs")
    args = p.parse_args()

    model = YOLO(args.weights)
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        name=args.name,
        patience=args.patience,
        project=args.project,
    )

    best = Path(args.project) / args.name / "weights" / "best.pt"
    if best.exists():
        out = Path(__file__).parent.parent / "models" / "plate_detector.pt"
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(best, out)
        print(f"copied {best} → {out}")
    else:
        print(f"warning: best.pt not found at {best}")

    print("done", results)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
