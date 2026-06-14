from typing import Optional
import numpy as np
import cv2
from app.recognizers.base import Detection
from app.plate_normalize import normalize
from app.settings import settings


class YoloOcrRecognizer:
    name = "yolo+easyocr"

    def __init__(self) -> None:
        from ultralytics import YOLO
        import easyocr

        self._detector = YOLO(settings.yolo_detector_weights)
        self._ocr = easyocr.Reader(
            [settings.ocr_lang],
            gpu=settings.ocr_use_gpu,
            verbose=False,
        )

    def recognize(self, image_bgr: np.ndarray) -> Optional[Detection]:
        res = self._detector.predict(
            image_bgr,
            imgsz=settings.yolo_imgsz,
            conf=settings.yolo_conf,
            device=settings.yolo_device,
            verbose=False,
        )
        if not res:
            return None

        boxes = res[0].boxes
        if boxes is None or boxes.xyxy is None or len(boxes) == 0:
            return None

        confs = boxes.conf.cpu().numpy()
        idx = int(np.argmax(confs))
        x1, y1, x2, y2 = boxes.xyxy[idx].cpu().numpy().astype(int).tolist()
        det_conf = float(confs[idx])

        pad = 4
        h, w = image_bgr.shape[:2]
        x1c = max(0, x1 - pad); y1c = max(0, y1 - pad)
        x2c = min(w, x2 + pad); y2c = min(h, y2 + pad)
        crop = image_bgr[y1c:y2c, x1c:x2c]
        if crop.size == 0:
            return None

        plate_text, ocr_conf = self._read_plate(crop)
        if plate_text is None:
            return None

        return Detection(
            plate=plate_text,
            confidence=float(det_conf * ocr_conf),
            bbox=(x1, y1, x2 - x1, y2 - y1),
        )

    def _read_plate(self, crop_bgr: np.ndarray) -> tuple[Optional[str], float]:
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        scale = max(1.0, 64.0 / max(1, gray.shape[0]))
        if scale > 1.0:
            gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

        results = self._ocr.readtext(
            gray,
            allowlist="0123456789",
            detail=1,
            paragraph=False,
        )
        if not results:
            return None, 0.0

        results.sort(key=lambda r: -float(r[2]))
        raw_concat = "".join(str(r[1]) for r in results[:2])
        normalized = normalize(raw_concat)
        if normalized is None:
            return None, 0.0
        top_conf = float(results[0][2])
        return normalized, top_conf
