from app.recognizers.base import Recognizer
from app.settings import settings


def build_recognizer() -> Recognizer:
    backend = settings.lpr_backend.lower()
    if backend == "stub":
        from app.recognizers.stub import StubRecognizer
        return StubRecognizer()
    if backend == "yolo":
        from app.recognizers.yolo_ocr import YoloOcrRecognizer
        return YoloOcrRecognizer()
    raise ValueError(f"Unknown LPR_BACKEND: {settings.lpr_backend}")
