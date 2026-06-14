import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';
import type { Vehicle, AccessRule } from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE,
  plate_display TEXT,
  owner_name TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate) WHERE active = 1;

CREATE TABLE IF NOT EXISTS access_rules (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  days_of_week TEXT NOT NULL DEFAULT '[]',
  time_from TEXT,
  time_to TEXT,
  valid_from TEXT,
  valid_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_rules_vehicle ON access_rules(vehicle_id) WHERE active = 1;

CREATE TABLE IF NOT EXISTS event_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  snapshot_local_path TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_queue_next ON event_queue(next_attempt_at);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function open(): Database.Database {
  const dir = dirname(config.cache.dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(config.cache.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

export class Cache {
  private db: Database.Database;

  constructor() {
    this.db = open();
  }

  close(): void {
    this.db.close();
  }

  findVehicleByPlate(plate: string): Vehicle | null {
    const row = this.db
      .prepare<[string], Record<string, unknown>>(
        `SELECT id, plate, plate_display, owner_name, vehicle_type, active
           FROM vehicles WHERE plate = ? AND active = 1`,
      )
      .get(plate);
    if (!row) return null;
    return {
      id: String(row.id),
      plate: String(row.plate),
      plate_display: (row.plate_display as string | null) ?? null,
      owner_name: (row.owner_name as string | null) ?? null,
      vehicle_type: (row.vehicle_type as 'car' | 'truck' | 'other') ?? 'car',
      active: Boolean(row.active),
    };
  }

  rulesForVehicle(vehicleId: string): AccessRule[] {
    const rows = this.db
      .prepare<[string], Record<string, unknown>>(
        `SELECT id, vehicle_id, rule_type, days_of_week,
                time_from, time_to, valid_from, valid_to, active
           FROM access_rules WHERE vehicle_id = ? AND active = 1`,
      )
      .all(vehicleId);
    return rows.map((row) => ({
      id: String(row.id),
      vehicle_id: String(row.vehicle_id),
      rule_type: row.rule_type as AccessRule['rule_type'],
      days_of_week: JSON.parse(String(row.days_of_week ?? '[]')) as number[],
      time_from: (row.time_from as string | null) ?? null,
      time_to: (row.time_to as string | null) ?? null,
      valid_from: (row.valid_from as string | null) ?? null,
      valid_to: (row.valid_to as string | null) ?? null,
      active: Boolean(row.active),
    }));
  }

  replaceVehiclesAndRules(vehicles: Vehicle[], rules: AccessRule[]): void {
    const tx = this.db.transaction(() => {
      this.db.exec('DELETE FROM access_rules; DELETE FROM vehicles;');
      const insV = this.db.prepare(
        `INSERT INTO vehicles (id, plate, plate_display, owner_name, vehicle_type, active)
         VALUES (@id, @plate, @plate_display, @owner_name, @vehicle_type, @active)`,
      );
      for (const v of vehicles) {
        insV.run({
          id: v.id,
          plate: v.plate,
          plate_display: v.plate_display,
          owner_name: v.owner_name,
          vehicle_type: v.vehicle_type,
          active: v.active ? 1 : 0,
        });
      }
      const insR = this.db.prepare(
        `INSERT INTO access_rules (id, vehicle_id, rule_type, days_of_week,
                                   time_from, time_to, valid_from, valid_to, active)
         VALUES (@id, @vehicle_id, @rule_type, @days_of_week,
                 @time_from, @time_to, @valid_from, @valid_to, @active)`,
      );
      for (const r of rules) {
        insR.run({
          id: r.id,
          vehicle_id: r.vehicle_id,
          rule_type: r.rule_type,
          days_of_week: JSON.stringify(r.days_of_week ?? []),
          time_from: r.time_from,
          time_to: r.time_to,
          valid_from: r.valid_from,
          valid_to: r.valid_to,
          active: r.active ? 1 : 0,
        });
      }
    });
    tx();
  }

  getMeta(key: string): string | null {
    const row = this.db
      .prepare<[string], { value: string }>(`SELECT value FROM meta WHERE key = ?`)
      .get(key);
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare(`INSERT INTO meta (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
      .run(key, value);
  }

  enqueueEvent(payload: object, snapshotPath: string | null): number {
    const info = this.db
      .prepare(
        `INSERT INTO event_queue (payload, snapshot_local_path)
         VALUES (?, ?)`,
      )
      .run(JSON.stringify(payload), snapshotPath);
    return Number(info.lastInsertRowid);
  }

  dueEvents(limit: number): Array<{ id: number; payload: string; snapshot_local_path: string | null; attempts: number }> {
    return this.db
      .prepare<[string, number], { id: number; payload: string; snapshot_local_path: string | null; attempts: number }>(
        `SELECT id, payload, snapshot_local_path, attempts
           FROM event_queue
          WHERE next_attempt_at <= ?
          ORDER BY id ASC
          LIMIT ?`,
      )
      .all(new Date().toISOString(), limit);
  }

  ackEvent(id: number): void {
    this.db.prepare(`DELETE FROM event_queue WHERE id = ?`).run(id);
  }

  failEvent(id: number, error: string, backoffMs: number): void {
    const next = new Date(Date.now() + backoffMs).toISOString();
    this.db
      .prepare(
        `UPDATE event_queue
            SET attempts = attempts + 1,
                last_error = ?,
                next_attempt_at = ?
          WHERE id = ?`,
      )
      .run(error, next, id);
  }
}
