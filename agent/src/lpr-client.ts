import { request } from 'undici';
import { config } from './config.js';
import type { IPlateRecognizer, PlateRead } from './types.js';
import { logger } from './logger.js';
import { normalizePlate } from './lib/plate.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const log = logger.child({ component: 'lpr' });

interface LprResponse {
  plate: string;
  confidence: number;
  bbox?: { x: number; y: number; w: number; h: number };
}

export class HttpPlateRecognizer implements IPlateRecognizer {
  async recognize(frame: Buffer): Promise<PlateRead | null> {
    const capturedAt = new Date().toISOString();
    const imagePath = await persistFrame(frame, capturedAt);

    try {
      const res = await request(config.lpr.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: frame,
        headersTimeout: config.lpr.timeoutMs,
        bodyTimeout: config.lpr.timeoutMs,
      });

      if (res.statusCode === 204) return null;
      if (res.statusCode >= 400) {
        const body = await res.body.text();
        log.warn({ status: res.statusCode, body }, 'LPR error');
        return null;
      }

      const data = (await res.body.json()) as LprResponse;
      const normalized = normalizePlate(data.plate);
      if (!normalized) {
        log.debug({ raw: data.plate }, 'plate failed normalization');
        return null;
      }

      const result: PlateRead = {
        plateRaw: data.plate,
        plateNormalized: normalized,
        confidence: data.confidence,
        imagePath,
        capturedAt,
      };
      if (data.bbox) result.bbox = data.bbox;
      return result;
    } catch (err) {
      log.error({ err }, 'LPR request failed');
      return null;
    }
  }
}

async function persistFrame(frame: Buffer, capturedAt: string): Promise<string> {
  if (!existsSync(config.storage.localDir)) {
    await mkdir(config.storage.localDir, { recursive: true });
  }
  const fname = `${capturedAt.replace(/[:.]/g, '-')}.jpg`;
  const fullPath = join(config.storage.localDir, fname);
  await writeFile(fullPath, frame);
  return fullPath;
}
