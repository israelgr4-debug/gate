from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    lpr_backend: str = "stub"

    stub_plate: str = "12345678"
    stub_confidence: float = 0.95

    yolo_detector_weights: str = "/app/models/plate_detector.pt"
    yolo_device: str = "cpu"
    yolo_imgsz: int = 640
    yolo_conf: float = 0.35

    ocr_lang: str = "en"
    ocr_use_gpu: bool = False

    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"


settings = Settings()
