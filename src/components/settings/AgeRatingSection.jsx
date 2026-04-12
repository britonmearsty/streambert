import React, { useState } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { RATING_COUNTRIES } from "../../utils/ageRating";
import { SettingsSelect } from "./SettingsSelect";

const AGE_LIMIT_OPTIONS = [
  { value: "", label: "No restriction" },
  { value: "0", label: "0 — All audiences (G / FSK 0)" },
  { value: "7", label: "7 — Family friendly (PG / FSK 6)" },
  { value: "12", label: "12 — Teens and up" },
  { value: "13", label: "13 — PG-13 and equivalent" },
  { value: "15", label: "15 — Older teens" },
  { value: "16", label: "16 — FSK 16 and equivalent" },
  { value: "17", label: "17 — R / 17+ and equivalent" },
  { value: "18", label: "18 — Adults only (NC-17 / FSK 18)" },
];

export const AgeRatingSection = React.memo(function AgeRatingSection() {
  const [ratingCountry, setRatingCountry] = useState(
    () => storage.get(STORAGE_KEYS.RATING_COUNTRY) || "US",
  );
  const [ageLimit, setAgeLimit] = useState(() => {
    const v = storage.get(STORAGE_KEYS.AGE_LIMIT);
    return v === null || v === undefined ? "" : String(v);
  });
  const [ageSaved, setAgeSaved] = useState(false);

  const saveAgeSettings = () => {
    storage.set(STORAGE_KEYS.RATING_COUNTRY, ratingCountry);
    if (ageLimit === "" || ageLimit === null) {
      storage.remove(STORAGE_KEYS.AGE_LIMIT);
    } else {
      storage.set(STORAGE_KEYS.AGE_LIMIT, Number(ageLimit));
    }
    setAgeSaved(true);
    setTimeout(() => setAgeSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">
        Age Rating &amp; Parental Controls
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        Set a maximum age rating. Content rated above this age will still be
        visible but <strong style={{ color: "var(--text)" }}>you won't be able to play it.</strong> Set to <em>No restriction</em> to
        disable this feature entirely.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text2)",
              marginBottom: 8,
            }}
          >
            Rating Country
          </div>
          <SettingsSelect
            value={ratingCountry}
            onChange={(v) => setRatingCountry(v)}
            options={RATING_COUNTRIES.map((c) => ({
              value: c.code,
              label: c.label,
            }))}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text2)",
              marginBottom: 8,
            }}
          >
            Maximum Allowed Age Rating
          </div>
          <SettingsSelect
            value={ageLimit}
            onChange={(v) => setAgeLimit(v)}
            options={AGE_LIMIT_OPTIONS}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={saveAgeSettings}>
            Save
          </button>
          {ageSaved && (
            <span style={{ fontSize: 13, color: "#48c774" }}>✓ Saved</span>
          )}
        </div>
      </div>
    </div>
  );
});
