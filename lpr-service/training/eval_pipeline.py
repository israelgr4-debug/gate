"""End-to-end evaluation of detector + OCR on a labeled set with ground-truth plates.

Expects a CSV with columns: image_path, plate_truth (digits only).

Usage:
    python eval_pipeline.py --csv eval_ground_truth.csv \
                            --weights ../models/plate_detector.pt \
                            --device cpu
Outputs:
    - exact_match_accuracy
    - per-row failure log → eval_failures.csv
"""
from __future__ import annotations
import argparse
import csv
import sys
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.recognizers.yolo_ocr import YoloOcrRecognizer  # noqa: E402
from app.settings import settings  # noqa: E402
from app.plate_normalize import normalize  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--csv", required=True)
    p.add_argument("--weights", default=None)
    p.add_argument("--device", default=None)
    p.add_argument("--failures", default="eval_failures.csv")
    args = p.parse_args()

    if args.weights:
        settings.yolo_detector_weights = args.weights
    if args.device:
        settings.yolo_device = args.device

    recognizer = YoloOcrRecognizer()

    total = 0
    correct = 0
    failures: list[tuple[str, str, str]] = []

    with open(args.csv, newline="") as f:
        for row in csv.DictReader(f):
            total += 1
            img_path = row["image_path"]
            truth = normalize(row["plate_truth"]) or row["plate_truth"]
            img = cv2.imread(img_path)
            if img is None:
                failures.append((img_path, truth, "READ_FAIL"))
                continue
            det = recognizer.recognize(img)
            pred = det.plate if det else ""
            if pred == truth:
                correct += 1
            else:
                failures.append((img_path, truth, pred))

    print(f"total={total} correct={correct} acc={correct / max(1, total):.3f}")

    with open(args.failures, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image_path", "truth", "predicted"])
        w.writerows(failures)
    print(f"failures → {args.failures} ({len(failures)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
