import { readFile, unlink } from 'node:fs/promises';
import { basename } from 'node:path';
import { Cache } from './cache.js';
import { supabase } from './supabase-client.js';
import { logger } from './logger.js';
import { config } from './config.js';
import type { AccessEventDraft } from './types.js';

const log = logger.child({ component: 'queue' });

const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000, 900_000];

function backoffFor(attempts: number): number {
  const idx = Math.min(attempts, BACKOFF_MS.length - 1);
  return BACKOFF_MS[idx] ?? 900_000;
}

export class EventQueue {
  private timer: NodeJS.Timeout | null = null;
  constructor(private cache: Cache) {}

  enqueue(event: AccessEventDraft): void {
    this.cache.enqueueEvent(event, event.snapshot_local_path);
    log.debug({ decision: event.decision }, 'event queued');
  }

  async flush(): Promise<void> {
    const sb = supabase();
    const due = this.cache.dueEvents(20);
    for (const row of due) {
      try {
        const event = JSON.parse(row.payload) as AccessEventDraft;

        let snapshotPath: string | null = null;
        if (row.snapshot_local_path) {
          const buf = await readFile(row.snapshot_local_path);
          const key = `${config.deviceId}/${basename(row.snapshot_local_path)}`;
          const up = await sb.storage
            .from(config.storage.bucket)
            .upload(key, buf, { contentType: 'image/jpeg', upsert: true });
          if (up.error) throw up.error;
          snapshotPath = up.data.path;
        }

        const insert = await sb.from('access_events').insert({
          device_id: event.device_id,
          captured_at: event.captured_at,
          plate_read: event.plate_read,
          plate_display: event.plate_display,
          matched_vehicle_id: event.matched_vehicle_id,
          decision: event.decision,
          reason: event.reason,
          confidence: event.confidence,
          gate_opened: event.gate_opened,
          snapshot_path: snapshotPath,
        });
        if (insert.error) throw insert.error;

        this.cache.ackEvent(row.id);
        if (row.snapshot_local_path) {
          await unlink(row.snapshot_local_path).catch(() => {});
        }
        log.info({ id: row.id, decision: event.decision }, 'event uploaded');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.cache.failEvent(row.id, msg, backoffFor(row.attempts));
        log.warn({ id: row.id, attempts: row.attempts, err: msg }, 'event upload failed');
      }
    }
  }

  start(): void {
    const tick = () => {
      this.flush().catch((err) => log.warn({ err }, 'flush threw'));
    };
    tick();
    this.timer = setInterval(tick, 10_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
