# Training pipeline — Israeli plate detector

Two-stage system: **YOLOv8 detects the plate** → **OCR reads digits** (`app/recognizers/yolo_ocr.py`).
This folder fine-tunes the detector. The OCR is EasyOCR with a digit allowlist — no training required to start.

## End-to-end workflow

```
RTSP stream → capture frames → pre-label → fix labels → split → train YOLOv8 → eval → drop weights in ../models/
```

### 1. Capture frames from the camera
```powershell
python capture_frames.py --rtsp "rtsp://user:pass@192.168.1.10:554/Streaming/Channels/101" `
                        --out captures/raw --fps 1 --max 2000
```
Aim for **300–500 frames** with diverse conditions: day, night, dirty plates, angled approach, rain, headlight glare.

### 2. Pre-label with a generic model (optional speed-up)
```powershell
python bootstrap_labels.py --src captures/raw --dst captures/labeled --weights yolov8n.pt
```
This drops YOLO `.txt` files next to the images. **You must review and correct them** — they are not ground truth.

### 3. Manual review
Use **CVAT**, **Label Studio**, or **Roboflow** to review and adjust the bounding boxes. Class id is always `0` (`plate`).

### 4. Split into train/val/test
```powershell
python split_dataset.py --src captures/labeled --dst datasets/plates
```

### 5. Fine-tune the detector
On the GPU machine, with a CUDA device:
```powershell
python train_detector.py --weights yolov8n.pt --epochs 80 --imgsz 640 --batch 16 --device 0
```
The best weights are copied to `../models/plate_detector.pt` automatically.

### 6. Evaluate end-to-end (detector + OCR)
Prepare a CSV `eval_ground_truth.csv` with columns `image_path,plate_truth`. Then:
```powershell
python eval_pipeline.py --csv eval_ground_truth.csv --weights ../models/plate_detector.pt --device 0
```
Failures are written to `eval_failures.csv` for inspection.

## Notes

- **Israeli plates are numeric only.** The OCR pass uses `allowlist="0123456789"`, which dramatically cuts errors compared to general OCR.
- **Aim for plate width ≥ 100 px** in the captured frame. The detector is robust, but OCR is not.
- **Night images** are the hardest. If the camera uses IR at night, the plate reflective surface will saturate. Use a low-power continuous LED instead.
- **Augmentation** is on by default in Ultralytics — don't over-tune. Start with `yolov8n.pt` (~3 MB), only move to `yolov8s.pt` if accuracy is lacking.

## Where the trained model is consumed

`app/recognizers/yolo_ocr.py` reads its weights from `LPR_BACKEND=yolo` + `YOLO_DETECTOR_WEIGHTS`.
Default path: `/app/models/plate_detector.pt` inside the container — mount your trained weights there.
