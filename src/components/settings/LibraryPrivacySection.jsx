import React, { useState } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { Toggle } from "./Toggle";
import { SettingsSelect } from "./SettingsSelect";

const SORT_OPTIONS = [
  { value: "manual", label: "Custom order" },
  { value: "title", label: "Title A-Z" },
  { value: "rating", label: "Top rated" },
  { value: "year", label: "Newest first" },
];

export const LibraryPrivacySection = React.memo(function LibraryPrivacySection() {
  const [sort, setSort] = useState(
    () => storage.get(STORAGE_KEYS.LIBRARY_SORT) || "manual",
  );
  const [historyEnabled, setHistoryEnabled] = useState(() => {
    const v = storage.get(STORAGE_KEYS.HISTORY_ENABLED);
    return v === 0 || v === false ? false : true;
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.LIBRARY_SORT, sort);
    storage.set(STORAGE_KEYS.HISTORY_ENABLED, historyEnabled ? 1 : 0);
    window.dispatchEvent(
      new CustomEvent("streambert:library-sort-changed", { detail: sort }),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Library & Privacy</div>

      {/* Watchlist Sort */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          Watchlist sort order
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          How titles in your watchlist are sorted. "Custom order" keeps your
          drag-and-drop arrangement.
        </div>
        <SettingsSelect
          value={sort}
          onChange={(v) => setSort(v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Watch History Toggle */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={historyEnabled} onChange={setHistoryEnabled} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              Record watch history
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              When off, nothing you watch will be added to history or "Continue
              Watching".
            </div>
          </div>
        </div>
        {!historyEnabled && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "var(--red)",
              background: "rgba(229,9,20,0.08)",
              border: "1px solid rgba(229,9,20,0.2)",
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            ⚠ Watch history is disabled. Progress tracking and "Continue
            Watching" will not work.
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
});
