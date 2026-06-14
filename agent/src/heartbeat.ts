import { logger } from './logger.js';
import { supabase } from './supabase-client.js';
import { config } from './config.js';

const log = logger.child({ component: 'heartbeat' });

export class Heartbeat {
  private timer: NodeJS.Timeout | null = null;

  async beat(): Promise<void> {
    const sb = supabase();
    const { error } = await sb
      .from('gate_devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', config.deviceId);
    if (error) log.warn({ err: error }, 'heartbeat failed');
  }

  start(): void {
    const tick = () => {
      this.beat().catch((err) => log.warn({ err }, 'heartbeat threw'));
    };
    tick();
    this.timer = setInterval(tick, config.cache.heartbeatIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
