import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException
import numpy as np
import cv2

from app.settings import settings
from app.schemas import RecognizeResponse, BBox
from app.recognizers.registry import build_recognizer
from app.plate_normalize import normalize


logging.basicConfig(level=settings.log_level.upper())
log = logging.getLogger("lpr")

state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("loading recognizer backend=%s", settings.lpr_backend)
    state["recognizer"] = build_recognizer()
    log.info("recognizer ready: %s", state["recognizer"].name)
    yield


app = FastAPI(title="LPR service", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    r = state.get("recognizer")
    return {
        "ok": True,
        "backend": getattr(r, "name", None),
        "configured": settings.lpr_backend,
    }


@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(request: Request) -> Response:
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="empty body")

    arr = np.frombuffer(body, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="invalid image bytes")

    recognizer = state["recognizer"]
    det = recognizer.recognize(image)
    if det is None:
        return Response(status_code=204)

    normalized = normalize(det.plate)
    if normalized is None:
        return Response(status_code=204)

    payload = RecognizeResponse(
        plate=normalized,
        confidence=float(det.confidence),
        bbox=BBox(x=det.bbox[0], y=det.bbox[1], w=det.bbox[2], h=det.bbox[3])
        if det.bbox else None,
        backend=recognizer.name,
    )
    return Response(
        content=payload.model_dump_json(),
        media_type="application/json",
    )
