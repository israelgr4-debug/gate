"""Split a labeled image/label folder into train/val/test for YOLOv8.

Expects:
    <src>/images/*.jpg
    <src>/labels/*.txt   (YOLO format, same basename)

Produces:
    datasets/plates/images/{train,val,test}/...
    datasets/plates/labels/{train,val,test}/...

Usage:
    python split_dataset.py --src captures/labeled --dst datasets/plates \
                            --val 0.15 --test 0.10 --seed 42
"""
from __future__ import annotations
import argparse
import random
import shutil
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--src", required=True)
    p.add_argument("--dst", default="datasets/plates")
    p.add_argument("--val", type=float, default=0.15)
    p.add_argument("--test", type=float, default=0.10)
    p.add_argument("--seed", type=int, default=42)
    args = p.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    img_src = src / "images"
    lbl_src = src / "labels"

    pairs = []
    for img in sorted(img_src.glob("*.jpg")):
        lbl = lbl_src / (img.stem + ".txt")
        if lbl.exists():
            pairs.append((img, lbl))
    if not pairs:
        print(f"no labeled pairs found under {src}")
        return 1

    random.seed(args.seed)
    random.shuffle(pairs)
    n = len(pairs)
    n_test = int(n * args.test)
    n_val = int(n * args.val)
    splits = {
        "test": pairs[:n_test],
        "val": pairs[n_test : n_test + n_val],
        "train": pairs[n_test + n_val :],
    }

    for split, items in splits.items():
        (dst / "images" / split).mkdir(parents=True, exist_ok=True)
        (dst / "labels" / split).mkdir(parents=True, exist_ok=True)
        for img, lbl in items:
            shutil.copy2(img, dst / "images" / split / img.name)
            shutil.copy2(lbl, dst / "labels" / split / lbl.name)
        print(f"{split}: {len(items)}")
    print(f"total: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
