import { logger } from './logger.js';
import { supabase } from './supabase-client.js';
import { config } from './config.js';
import { pulseGate } from './relay.js';

const log = logger.child({ component: 'manual' });

export class ManualActions {
  private channel: ReturnType<ReturnType<typeof supabase>['channel']> | null = null;

  start(): void {
    const sb = supabase();
    this.channel = sb
      .channel(`manual_actions:${config.deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'manual_actions',
          filter: `device_id=eq.${config.deviceId}`,
        },
        async (payload) => {
          log.info({ payload: payload.new }, 'manual open received');
          try {
            await pulseGate();
          } catch (err) {
            log.error({ err }, 'manual pulse failed');
          }
        },
      )
      .subscribe((status) => log.info({ status }, 'manual actions channel'));
  }

  async stop(): Promise<void> {
    if (this.channel) {
      await supabase().removeChannel(this.channel);
      this.channel = null;
    }
  }
}
