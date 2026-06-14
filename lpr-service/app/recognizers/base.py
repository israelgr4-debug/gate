from dataclasses import dataclass
from typing import Optional, Protocol
import numpy as np


@dataclass
class Detection:
    plate: str
    confidence: float
    bbox: Optional[tuple[int, int, int, int]] = None  # x, y, w, h


class Recognizer(Protocol):
    name: str

    def recognize(self, image_bgr: np.ndarray) -> Optional[Detection]:
        ...
