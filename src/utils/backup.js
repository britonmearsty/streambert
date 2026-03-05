// ── Backup & Restore Utilities ────────────────────────────────────────────────
// Single source of truth for which keys are included in backups.
// Used by manual export/import (SettingsPage) and scheduled backups (App.jsx).

const PREFIX = "streambert_";

// All localStorage keys (without prefix) that are included in backups
export const BACKUP_KEYS = [
  "saved",
  "savedOrder",
  "history",
  "progress",
  "watched",
  "homeRowOrder",
  "homeRowVisible",
  "startPage",
  "ageLimit",
  "ratingCountry",
  "watchedThreshold",
  "subtitleDownload",
  "subtitleLang",
  "invidiousBase",
  "autoCheckUpdates",
  "playerSource",
  "downloadPath",
];

/**
 * Reads all backup keys from localStorage and returns a plain data object.
 * Null values are omitted to keep exports clean.
 */
export function collectBackupData() {
  const data = {};
  for (const key of BACKUP_KEYS) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw !== null) data[key] = JSON.parse(raw);
    } catch {
      // skip unparseable entries
    }
  }
  return data;
}

/**
 * Writes a data object back into localStorage.
 * Only keys present in BACKUP_KEYS are written (no arbitrary injection).
 */
export function restoreBackupData(data) {
  if (!data || typeof data !== "object") throw new Error("Invalid backup data");
  for (const key of BACKUP_KEYS) {
    if (data[key] !== undefined && data[key] !== null) {
      localStorage.setItem(PREFIX + key, JSON.stringify(data[key]));
    }
  }
}
