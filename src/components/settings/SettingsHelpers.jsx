import React from "react";

export function SectionGroupHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32, marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            letterSpacing: 2,
            color: "var(--red)",
            textTransform: "uppercase",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          style={{ flex: 1, height: 1, background: "rgba(229,9,20,0.18)" }}
        />
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function Divider() {
  return (
    <div style={{ height: 1, background: "var(--border)", marginBottom: 40 }} />
  );
}
