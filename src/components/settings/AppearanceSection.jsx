import React, { useState } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { ACCENT_PRESETS, applyAccentColor } from "../../utils/appearance";
import { Toggle } from "./Toggle";

export const AppearanceSection = React.memo(function AppearanceSection() {
  const [accent, setAccent] = useState(
    () => storage.get(STORAGE_KEYS.ACCENT_COLOR) || "red",
  );
  const [fontSize, setFontSize] = useState(
    () => storage.get(STORAGE_KEYS.FONT_SIZE) || "normal",
  );
  const [compact, setCompact] = useState(
    () => !!storage.get(STORAGE_KEYS.COMPACT_MODE),
  );
  const [noAnim, setNoAnim] = useState(
    () => !!storage.get(STORAGE_KEYS.REDUCE_ANIMATIONS),
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.ACCENT_COLOR, accent);
    storage.set(STORAGE_KEYS.FONT_SIZE, fontSize);
    storage.set(STORAGE_KEYS.COMPACT_MODE, compact ? 1 : 0);
    storage.set(STORAGE_KEYS.REDUCE_ANIMATIONS, noAnim ? 1 : 0);
    applyAccentColor(accent);
    const zoomMap = { sm: 0.85, normal: 1, lg: 1.15 };
    if (window.electron?.setZoomFactor)
      window.electron.setZoomFactor(zoomMap[fontSize] ?? 1);
    document.body.classList.toggle("compact-mode", compact);
    document.body.classList.toggle("no-anim", noAnim);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Appearance</div>

      {/* Accent Colour */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 10,
          }}
        >
          Accent Colour
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setAccent(p.id)}
              title={p.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: p.color,
                border:
                  accent === p.id
                    ? `3px solid var(--text)`
                    : "3px solid transparent",
                outline: accent === p.id ? `2px solid ${p.color}` : "none",
                outlineOffset: 2,
                cursor: "pointer",
                transition: "transform 0.15s",
                transform: accent === p.id ? "scale(1.15)" : "scale(1)",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
          {ACCENT_PRESETS.find((p) => p.id === accent)?.label}, applied to
          buttons, highlights, and indicators.
        </div>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 10,
          }}
        >
          Font Size
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "sm", label: "Small" },
            { id: "normal", label: "Normal" },
            { id: "lg", label: "Large" },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setFontSize(o.id)}
              className={
                fontSize === o.id ? "btn btn-primary" : "btn btn-ghost"
              }
              style={{
                padding: "7px 18px",
                fontSize: o.id === "sm" ? 12 : o.id === "lg" ? 16 : 14,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={compact} onChange={setCompact} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              Compact card grid
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              Shows more titles per row by reducing card size.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={noAnim} onChange={setNoAnim} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              Reduce animations
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              Disables transitions and hover effects throughout the app.
            </div>
          </div>
        </div>
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
