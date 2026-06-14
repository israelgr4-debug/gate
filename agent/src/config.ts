import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number, got "${v}"`);
  return n;
}

export const config = {
  deviceId: required('DEVICE_ID'),

  supabase: {
    url: required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_KEY'),
  },

  relay: {
    ip: required('RELAY_IP'),
    port: num('RELAY_PORT', 502),
    unitId: num('RELAY_UNIT_ID', 1),
    channel: num('RELAY_CHANNEL', 0),
    pulseMs: num('RELAY_PULSE_MS', 600),
  },

  camera: {
    rtspUrl: required('CAMERA_RTSP_URL'),
    frameIntervalMs: num('CAMERA_FRAME_INTERVAL_MS', 400),
  },

  lpr: {
    endpoint: required('LPR_ENDPOINT'),
    timeoutMs: num('LPR_TIMEOUT_MS', 4000),
  },

  decision: {
    confidenceThreshold: num('CONFIDENCE_THRESHOLD', 0.8),
    cooldownSeconds: num('COOLDOWN_SECONDS', 30),
  },

  cache: {
    dbPath: optional('CACHE_DB_PATH', './data/cache.sqlite'),
    syncIntervalMs: num('SYNC_INTERVAL_MS', 60_000),
    heartbeatIntervalMs: num('HEARTBEAT_INTERVAL_MS', 30_000),
  },

  storage: {
    bucket: optional('SNAPSHOT_BUCKET', 'plate-snapshots'),
    localDir: optional('SNAPSHOT_DIR', './data/snapshots'),
  },

  logLevel: optional('LOG_LEVEL', 'info'),
  timezone: optional('TZ', 'Asia/Jerusalem'),
} as const;

export type Config = typeof config;
