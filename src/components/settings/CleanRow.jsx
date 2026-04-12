import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

export function CleanRow({
  title,
  description,
  buttonLabel,
  onAction,
  danger,
  sizeLabel,
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [hovered, setHovered] = useState(false);

  const handle = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await onAction();
      if (result?.cancelled) {
        // User dismissed the confirm dialog
        return;
      }
      setStatus(result?.msg || "✓ Done");
      setTimeout(() => setStatus(null), 4000);
    } catch (e) {
      setStatus("✕ " + (e.message || "Something went wrong"));
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {title}
          {sizeLabel && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text2)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 10px",
                letterSpacing: 0.2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {sizeLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
          {description}
        </div>
        <StatusBadge status={status} />
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={handle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={
            danger
              ? {
                  color: hovered ? "#fff" : "var(--red)",
                  background: hovered ? "rgba(229,9,20,0.85)" : "transparent",
                  borderColor: hovered ? "transparent" : "rgba(229,9,20,0.35)",
                  opacity: busy ? 0.5 : 1,
                  transition: "all 0.2s",
                }
              : { opacity: busy ? 0.5 : 1 }
          }
        >
          {busy ? "Working…" : buttonLabel}
        </button>
      </div>
    </div>
  );
}
