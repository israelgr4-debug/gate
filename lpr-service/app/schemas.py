from pydantic import BaseModel, Field
from typing import Optional


class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class RecognizeResponse(BaseModel):
    plate: str = Field(..., description="Digits-only Israeli plate (7-8 chars)")
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: Optional[BBox] = None
    backend: str
