"""Bootstrap detector labels: use an existing YOLO weights file to pre-label captures.

Outputs YOLO-format .txt next to each image, ready for manual fix-up in CVAT/Roboflow.

Usage:
    python bootstrap_labels.py --src captures/raw --dst captures/labeled \
                               --weights yolov8n.pt --conf 0.25
After running, inspect & fix labels in your tool of choice, then run split_dataset.py.
"""
from __future__ import annotations
import argparse
import shutil
from pathlib import Path


def main() -> int:
    from ultralytics import YOLO
    import cv2

    p = argparse.ArgumentParser()
    p.add_argument("--src", required=True)
    p.add_argument("--dst", required=True)
    p.add_argument("--weights", default="yolov8n.pt")
    p.add_argument("--conf", type=float, default=0.25)
    p.add_argument("--class-id", type=int, default=0,
                   help="if using a generic model, filter to this class id (e.g. 2=car in COCO)")
    p.add_argument("--filter-generic", action="store_true",
                   help="enable class-id filter; off by default (assumes plate-trained weights)")
    args = p.parse_args()

    src = Path(args.src)
    dst = Path(args.dst)
    img_dst = dst / "images"; img_dst.mkdir(parents=True, exist_ok=True)
    lbl_dst = dst / "labels"; lbl_dst.mkdir(parents=True, exist_ok=True)

    model = YOLO(args.weights)

    total = 0; labeled = 0
    for img_path in sorted(src.glob("*.jpg")):
        total += 1
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]
        res = model.predict(img, conf=args.conf, verbose=False)
        if not res or res[0].boxes is None or len(res[0].boxes) == 0:
            continue

        lines: list[str] = []
        for box, cls in zip(res[0].boxes.xyxy.cpu().numpy(),
                            res[0].boxes.cls.cpu().numpy().astype(int)):
            if args.filter_generic and cls != args.class_id:
                continue
            x1, y1, x2, y2 = box
            cx = (x1 + x2) / 2 / w
            cy = (y1 + y2) / 2 / h
            bw = (x2 - x1) / w
            bh = (y2 - y1) / h
            lines.append(f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        if not lines:
            continue

        shutil.copy2(img_path, img_dst / img_path.name)
        (lbl_dst / (img_path.stem + ".txt")).write_text("\n".join(lines))
        labeled += 1

    print(f"total={total} labeled={labeled} dst={dst}")
    print("NOTE: review and correct labels manually — bootstrap labels are NOT ground truth.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
