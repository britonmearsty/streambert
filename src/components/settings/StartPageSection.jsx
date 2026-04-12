import React, { useState } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { SettingsSelect } from "./SettingsSelect";

export const StartPageSection = React.memo(function StartPageSection() {
  const [startPage, setStartPage] = useState(
    () => storage.get(STORAGE_KEYS.START_PAGE) || "home",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.START_PAGE, startPage);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Start Page</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Choose which page opens when you launch Streambert.
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SettingsSelect
          value={startPage}
          onChange={(v) => setStartPage(v)}
          options={[
            { value: "home", label: "🏠  Home" },
            { value: "history", label: "🕐  Library / History" },
            { value: "downloads", label: "⬇  Downloads" },
          ]}
        />
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
