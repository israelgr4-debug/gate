import { logger } from './logger.js';
import { supabase } from './supabase-client.js';
import { Cache } from './cache.js';
import type { Vehicle, AccessRule } from './types.js';
import { config } from './config.js';

const log = logger.child({ component: 'sync' });

export class Sync {
  private timer: NodeJS.Timeout | null = null;
  constructor(private cache: Cache) {}

  async runOnce(): Promise<void> {
    const sb = supabase();
    const [vRes, rRes] = await Promise.all([
      sb.from('vehicles').select('id, plate, plate_display, owner_name, vehicle_type, active'),
      sb.from('access_rules').select(
        'id, vehicle_id, rule_type, days_of_week, time_from, time_to, valid_from, valid_to, active',
      ),
    ]);
    if (vRes.error) throw vRes.error;
    if (rRes.error) throw rRes.error;

    const vehicles = (vRes.data ?? []) as Vehicle[];
    const rules = (rRes.data ?? []) as AccessRule[];
    this.cache.replaceVehiclesAndRules(vehicles, rules);
    this.cache.setMeta('last_sync_at', new Date().toISOString());
    log.info({ vehicles: vehicles.length, rules: rules.length }, 'sync ok');
  }

  start(): void {
    const tick = async () => {
      try {
        await this.runOnce();
      } catch (err) {
        log.warn({ err }, 'sync failed; keeping previous cache');
      }
    };
    void tick();
    this.timer = setInterval(tick, config.cache.syncIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
