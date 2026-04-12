import { useState, useEffect, useRef } from "react";

export function SettingsSelect({ value, onChange, options, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ?? value;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 28,
          padding: "9px 14px",
          background: open ? "var(--surface3)" : "var(--surface2)",
          border: `1px solid ${open ? "var(--red)" : "var(--border)"}`,
          boxShadow: open ? "0 0 0 3px rgba(229,9,20,0.12)" : "none",
          borderRadius: 8,
          color: "var(--text)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minWidth: 0,
          transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "var(--surface3)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "var(--surface2)";
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {selectedLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text3)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 10001,
            background: "var(--surface3)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            minWidth: "100%",
            maxHeight: 280,
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <div
                key={o.value}
                onMouseDown={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 14,
                  borderRadius: 7,
                  cursor: "pointer",
                  color: active ? "var(--red)" : "var(--text)",
                  background: active ? "rgba(229,9,20,0.10)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  transition: "background 0.1s, color 0.1s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
