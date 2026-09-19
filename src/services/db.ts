import * as SQLite from 'expo-sqlite';
import { AccountProfile, Worker, Shift, Wristband, Reading, AppSettings, DEFAULT_SETTINGS, INDIA_FACTORY_H2S_LIMITS } from '../types';

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
      scan_quality                REAL NOT NULL DEFAULT 0,
      sample_count                INTEGER NOT NULL DEFAULT 1,
      is_saturated                INTEGER NOT NULL DEFAULT 0,
      raw_image_path              TEXT,
      FOREIGN KEY (shift_id) REFERENCES shifts(id),
      FOREIGN KEY (wristband_id) REFERENCES wristbands(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_profile (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      name        TEXT NOT NULL,
      worker_code TEXT NOT NULL,
      site_id     TEXT NOT NULL,
      worker_id   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS translation_cache (
      cache_key       TEXT PRIMARY KEY,
      language_code   TEXT NOT NULL,
      source_text     TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_preferences (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await ensureReadingColumns(db);
  await _ensureDefaultSettings(db);
}

/** Add scanner metadata without deleting readings created by older builds. */
async function ensureReadingColumns(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(readings)`);
  const names = new Set(columns.map(column => column.name));
  const additions = [
    ['scan_quality', 'REAL NOT NULL DEFAULT 0'],
    ['sample_count', 'INTEGER NOT NULL DEFAULT 1'],
    ['is_saturated', 'INTEGER NOT NULL DEFAULT 0'],
  ] as const;

  for (const [name, definition] of additions) {
    if (!names.has(name)) {
      await db.execAsync(`ALTER TABLE readings ADD COLUMN ${name} ${definition}`);
    }
  }
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

// ─── Personal account ────────────────────────────────────────────────────────

export async function getAccountProfile(): Promise<AccountProfile | null> {
  const db = await getDB();
  return db.getFirstAsync<AccountProfile>(`SELECT * FROM account_profile WHERE id = 1`);
}

export async function saveAccountProfile(details: Pick<AccountProfile, 'name' | 'worker_code' | 'site_id'>): Promise<AccountProfile> {
  const db = await getDB();
  const existing = await getAccountProfile();
  const normalized = {
    name: details.name.trim(),
    worker_code: details.worker_code.trim().toUpperCase(),
    site_id: details.site_id.trim().toUpperCase(),
  };

  if (existing) {
    await updateWorker(existing.worker_id, normalized);
    await db.runAsync(
      `UPDATE account_profile SET name = ?, worker_code = ?, site_id = ? WHERE id = 1`,
      [normalized.name, normalized.worker_code, normalized.site_id]
    );
    return { ...existing, ...normalized };
  }

  const worker = await createWorker(normalized);
  await db.runAsync(
    `INSERT INTO account_profile (id, name, worker_code, site_id, worker_id) VALUES (1, ?, ?, ?, ?)`,
    [worker.name, worker.worker_code, worker.site_id, worker.id]
  );
  return { id: 1, ...normalized, worker_id: worker.id };
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

// ─── Readings ─────────────────────────────────────────────────────────────────

export async function saveReading(reading: Omit<Reading, 'id'>): Promise<Reading> {
  const db = await getDB();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO readings (
      id, shift_id, wristband_id, captured_at, band_valid, expiry_delta_e,
      sensing_delta_e, cumulative_ppm_hr, twa_ppm, h2s_index, index_mode,
      risk_band, calibration_curve_version, scan_quality, sample_count,
      is_saturated, raw_image_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, reading.shift_id, reading.wristband_id, reading.captured_at,
      reading.band_valid ? 1 : 0, reading.expiry_delta_e, reading.sensing_delta_e,
      reading.cumulative_ppm_hr, reading.twa_ppm, reading.h2s_index,
      reading.index_mode, reading.risk_band, reading.calibration_curve_version,
      reading.scan_quality, reading.sample_count, reading.is_saturated ? 1 : 0,
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
  return {
    ...row,
    band_valid: row.band_valid === 1,
    is_saturated: row.is_saturated === 1,
    scan_quality: Number(row.scan_quality ?? 0),
    sample_count: Number(row.sample_count ?? 1),
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    // These safety values are deliberately not read from user-editable storage.
    // A colourimetric wristband is an exposure aid, not a compliance monitor.
    oel_twa_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
    oel_stel_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiStelPpm,
    oel_ceiling_ppm: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
    risk_elevated_twa: INDIA_FACTORY_H2S_LIMITS.earlyWarningPpm,
    risk_high_twa: INDIA_FACTORY_H2S_LIMITS.scheduleIiTwaPpm,
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

// ─── Translation cache ───────────────────────────────────────────────────────

export async function getCachedTranslation(cacheKey: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ translated_text: string }>(
    `SELECT translated_text FROM translation_cache WHERE cache_key = ?`, [cacheKey]
  );
  return row?.translated_text ?? null;
}

export async function saveCachedTranslation(cacheKey: string, languageCode: string, sourceText: string, translatedText: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO translation_cache (cache_key, language_code, source_text, translated_text, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [cacheKey, languageCode, sourceText, translatedText, new Date().toISOString()]
  );
}

export async function getPreference(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM app_preferences WHERE key = ?`, [key]);
  return row?.value ?? null;
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`INSERT OR REPLACE INTO app_preferences (key, value) VALUES (?, ?)`, [key, value]);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
