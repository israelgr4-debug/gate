import { config } from './config.js';
import { logger } from './logger.js';
import { Cache } from './cache.js';
import { evaluate } from './decision.js';
import { pulseGate } from './relay.js';
import { displayPlate } from './lib/plate.js';
import { HttpPlateRecognizer } from './lpr-client.js';
import { EventQueue } from './event-queue.js';
import type { AccessEventDraft, Decision } from './types.js';

const log = logger.child({ component: 'pipeline' });

export class Pipeline {
  private lpr = new HttpPlateRecognizer();
  private cooldown = new Map<string, number>();
  private busy = false;

  constructor(private cache: Cache, private queue: EventQueue) {}

  async onFrame(frame: Buffer): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const read = await this.lpr.recognize(frame);
      if (!read) return;

      if (read.confidence < config.decision.confidenceThreshold) {
        log.debug({ plate: read.plateNormalized, conf: read.confidence }, 'below threshold');
        return;
      }

      const now = Date.now();
      const last = this.cooldown.get(read.plateNormalized);
      if (last && now - last < config.decision.cooldownSeconds * 1000) {
        log.debug({ plate: read.plateNormalized }, 'cooldown — ignored');
        return;
      }
      this.cooldown.set(read.plateNormalized, now);

      const vehicle = this.cache.findVehicleByPlate(read.plateNormalized);
      let decision: Decision;
      let reason: string;
      let matchedVehicleId: string | null = null;
      let gateOpened = false;

      if (!vehicle) {
        decision = 'unrecognized';
        reason = 'plate_not_in_db';
      } else {
        matchedVehicleId = vehicle.id;
        const rules = this.cache.rulesForVehicle(vehicle.id);
        const result = evaluate(vehicle, rules);
        if (result.granted) {
          decision = 'granted';
          reason = result.reason;
          try {
            await pulseGate();
            gateOpened = true;
          } catch (err) {
            reason = `${result.reason};pulse_failed`;
            log.error({ err }, 'pulse failed for granted plate');
          }
        } else {
          decision = 'denied';
          reason = result.reason;
        }
      }

      const event: AccessEventDraft = {
        device_id: config.deviceId,
        captured_at: read.capturedAt,
        plate_read: read.plateNormalized,
        plate_display: displayPlate(read.plateNormalized),
        matched_vehicle_id: matchedVehicleId,
        decision,
        reason,
        confidence: read.confidence,
        gate_opened: gateOpened,
        snapshot_local_path: read.imagePath,
      };
      this.queue.enqueue(event);
      log.info(
        { plate: read.plateNormalized, decision, reason, gateOpened },
        'decision',
      );
    } finally {
      this.busy = false;
    }
  }
}
