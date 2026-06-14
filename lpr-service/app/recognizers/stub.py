from typing import Optional
import numpy as np
from app.recognizers.base import Detection
from app.settings import settings


class StubRecognizer:
    name = "stub"

    def recognize(self, image_bgr: np.ndarray) -> Optional[Detection]:
        h, w = image_bgr.shape[:2]
        return Detection(
            plate=settings.stub_plate,
            confidence=settings.stub_confidence,
            bbox=(int(w * 0.25), int(h * 0.4), int(w * 0.5), int(h * 0.2)),
        )
