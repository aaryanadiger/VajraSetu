import * as SQLite from 'expo-sqlite';
import { Worker, Shift, Wristband, Reading, AppSettings, DEFAULT_SETTINGS } from '../types';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('vajra_setu.db');
  }
  return _db;
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initDB(): Promise<void> {
  const db = await getDB();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS workers (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      worker_code TEXT NOT NULL UNIQUE,
      site_id     TEXT NOT NULL DEFAULT 'DEFAULT_SITE',
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wristbands (
      id                           TEXT PRIMARY KEY,
      batch_id                     TEXT NOT NULL,
      issued_at                    TEXT NOT NULL,
      expiry_calibration_version   TEXT NOT NULL DEFAULT 'v1'
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id           TEXT PRIMARY KEY,
      worker_id    TEXT NOT NULL,
      start_time   TEXT NOT NULL,
      end_time     TEXT,
      wristband_id TEXT NOT NULL,
      FOREIGN KEY (worker_id) REFERENCES workers(id),
      FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
    );

    CREATE TABLE IF NOT EXISTS readings (
      id                          TEXT PRIMARY KEY,
      shift_id                    TEXT NOT NULL,
      wristband_id                TEXT NOT NULL,
      captured_at                 TEXT NOT NULL,
      band_valid                  INTEGER NOT NULL DEFAULT 0,
      expiry_delta_e              REAL NOT NULL DEFAULT 0,
      sensing_delta_e             REAL NOT NULL DEFAULT 0,
      cumulative_ppm_hr           REAL NOT NULL DEFAULT 0,
      twa_ppm                     REAL NOT NULL DEFAULT 0,
      h2s_index                   REAL NOT NULL DEFAULT 0,
      index_mode                  TEXT NOT NULL DEFAULT 'estimated_single_sample',
      risk_band                   TEXT NOT NULL DEFAULT 'invalid',
      calibration_curve_version   TEXT NOT NULL DEFAULT 'v1',
      raw_image_path              TEXT,
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth (
      id        INTEGER PRIMARY KEY DEFAULT 1,
      pin_hash  TEXT
    );
  `);

  await _ensureDefaultSettings(db);
}

async function _ensureDefaultSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  const entries = Object.entries(DEFAULT_SETTINGS);
  for (const [key, value] of entries) {
    await db.runAsync(
      `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
      [key, String(value)]
    );
  }
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export async function createWorker(worker: Omit<Worker, 'id' | 'created_at'>): Promise<Worker> {
  const db = await getDB();
  const id = generateId();
  const created_at = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO workers (id, name, worker_code, site_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, worker.name, worker.worker_code, worker.site_id, created_at]
  );
  return { id, created_at, ...worker };
}

export async function getWorkers(): Promise<Worker[]> {
  const db = await getDB();
  return db.getAllAsync<Worker>(`SELECT * FROM workers ORDER BY name ASC`);
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const db = await getDB();
  return db.getFirstAsync<Worker>(`SELECT * FROM workers WHERE id = ?`, [id]);
}

export async function updateWorker(id: string, updates: Partial<Omit<Worker, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDB();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  await db.runAsync(`UPDATE workers SET ${fields} WHERE id = ?`, values);
}

export async function deleteWorker(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM workers WHERE id = ?`, [id]);
}

// ─── Wristbands ───────────────────────────────────────────────────────────────

export async function createWristband(wb: Omit<Wristband, 'id'>): Promise<Wristband> {
  const db = await getDB();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO wristbands (id, batch_id, issued_at, expiry_calibration_version) VALUES (?, ?, ?, ?)`,
    [id, wb.batch_id, wb.issued_at, wb.expiry_calibration_version]
  );
  return { id, ...wb };
}

export async function getWristbandById(id: string): Promise<Wristband | null> {
  const db = await getDB();
  return db.getFirstAsync<Wristband>(`SELECT * FROM wristbands WHERE id = ?`, [id]);
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function createShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
  const db = await getDB();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO shifts (id, worker_id, start_time, end_time, wristband_id) VALUES (?, ?, ?, ?, ?)`,
    [id, shift.worker_id, shift.start_time, shift.end_time ?? null, shift.wristband_id]
  );
  return { id, ...shift };
}

export async function endShift(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE shifts SET end_time = ? WHERE id = ?`, [new Date().toISOString(), id]);
}

export async function getShiftsByWorker(workerId: string): Promise<Shift[]> {
  const db = await getDB();
  return db.getAllAsync<Shift>(
    `SELECT * FROM shifts WHERE worker_id = ? ORDER BY start_time DESC`,
    [workerId]
  );
}

export async function getActiveShifts(): Promise<Shift[]> {
  const db = await getDB();
  return db.getAllAsync<Shift>(`SELECT * FROM shifts WHERE end_time IS NULL`);
}

// ─── Readings ─────────────────────────────────────────────────────────────────

export async function saveReading(reading: Omit<Reading, 'id'>): Promise<Reading> {
  const db = await getDB();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO readings (
      id, shift_id, wristband_id, captured_at, band_valid, expiry_delta_e,
      sensing_delta_e, cumulative_ppm_hr, twa_ppm, h2s_index, index_mode,
      risk_band, calibration_curve_version, raw_image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, reading.shift_id, reading.wristband_id, reading.captured_at,
      reading.band_valid ? 1 : 0, reading.expiry_delta_e, reading.sensing_delta_e,
      reading.cumulative_ppm_hr, reading.twa_ppm, reading.h2s_index,
      reading.index_mode, reading.risk_band, reading.calibration_curve_version,
      reading.raw_image_path ?? null,
    ]
  );
  return { id, ...reading };
}

export async function getReadingsByWorker(workerId: string): Promise<Reading[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT r.* FROM readings r
     JOIN shifts s ON r.shift_id = s.id
     WHERE s.worker_id = ?
     ORDER BY r.captured_at DESC`,
    [workerId]
  );
  return rows.map(deserializeReading);
}

export async function getReadingsByShift(shiftId: string): Promise<Reading[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM readings WHERE shift_id = ? ORDER BY captured_at DESC`,
    [shiftId]
  );
  return rows.map(deserializeReading);
}

export async function getAllReadingsToday(): Promise<Reading[]> {
  const db = await getDB();
  const today = new Date().toISOString().split('T')[0];
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM readings WHERE captured_at LIKE ? ORDER BY captured_at DESC`,
    [`${today}%`]
  );
  return rows.map(deserializeReading);
}

export async function getAllReadings(): Promise<Reading[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(`SELECT * FROM readings ORDER BY captured_at DESC`);
  return rows.map(deserializeReading);
}

function deserializeReading(row: any): Reading {
  return { ...row, band_valid: row.band_valid === 1 };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    oel_twa_ppm: parseFloat(map.oel_twa_ppm ?? '5'),
    oel_stel_ppm: parseFloat(map.oel_stel_ppm ?? '10'),
    oel_ceiling_ppm: parseFloat(map.oel_ceiling_ppm ?? '10'),
    risk_elevated_twa: parseFloat(map.risk_elevated_twa ?? '2.5'),
    risk_high_twa: parseFloat(map.risk_high_twa ?? '5'),
    risk_elevated_index: parseFloat(map.risk_elevated_index ?? '10'),
    risk_high_index: parseFloat(map.risk_high_index ?? '25'),
    calibration_curve_version: map.calibration_curve_version ?? 'v1',
    unit: (map.unit as 'ppm_hr' | 'mg_m3_hr') ?? 'ppm_hr',
  };
}

export async function setSetting(key: keyof AppSettings, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function getPinHash(): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ pin_hash: string | null }>(`SELECT pin_hash FROM auth WHERE id = 1`);
  return row?.pin_hash ?? null;
}

export async function setPinHash(hash: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`INSERT OR REPLACE INTO auth (id, pin_hash) VALUES (1, ?)`, [hash]);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
