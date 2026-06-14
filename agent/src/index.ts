import { logger } from './logger.js';
import { Cache } from './cache.js';
import { Sync } from './sync.js';
import { Heartbeat } from './heartbeat.js';
import { EventQueue } from './event-queue.js';
import { ManualActions } from './manual-actions.js';
import { Pipeline } from './pipeline.js';
import { RtspFrameSource } from './frame-source.js';

const log = logger.child({ component: 'main' });

async function main(): Promise<void> {
  log.info('agent starting');
  const cache = new Cache();
  const sync = new Sync(cache);
  const heartbeat = new Heartbeat();
  const queue = new EventQueue(cache);
  const manual = new ManualActions();
  const pipeline = new Pipeline(cache, queue);
  const frames = new RtspFrameSource((frame) => pipeline.onFrame(frame));

  sync.start();
  heartbeat.start();
  queue.start();
  manual.start();
  frames.start();

  const shutdown = async (signal: string) => {
    log.info({ signal }, 'shutting down');
    frames.stop();
    sync.stop();
    heartbeat.stop();
    queue.stop();
    await manual.stop();
    cache.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  log.info('agent running');
}

main().catch((err) => {
  log.fatal({ err }, 'agent crashed on startup');
  process.exit(1);
});
