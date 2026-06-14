import ModbusRTU from 'modbus-serial';
import { config } from './config.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'relay' });

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RelayError extends Error {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RelayError';
    this.cause = cause;
  }
}

async function withClient<T>(fn: (c: ModbusRTU) => Promise<T>): Promise<T> {
  const client = new ModbusRTU();
  try {
    await client.connectTCP(config.relay.ip, { port: config.relay.port });
    client.setID(config.relay.unitId);
    client.setTimeout(2000);
    return await fn(client);
  } finally {
    try {
      client.close(() => {});
    } catch {
      // best-effort close
    }
  }
}

export async function pulseGate(): Promise<void> {
  const { channel, pulseMs } = config.relay;
  log.info({ channel, pulseMs }, 'pulse start');
  try {
    await withClient(async (c) => {
      await c.writeCoil(channel, true);
      await sleep(pulseMs);
      await c.writeCoil(channel, false);
    });
    log.info({ channel }, 'pulse ok');
  } catch (err) {
    log.error({ err }, 'pulse failed');
    throw new RelayError('pulseGate failed', err);
  }
}

export async function ping(): Promise<boolean> {
  try {
    await withClient(async (c) => {
      await c.readCoils(0, 1);
    });
    return true;
  } catch (err) {
    log.warn({ err }, 'ping failed');
    return false;
  }
}
