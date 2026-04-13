import React from "react";

export function SectionGroupHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28, marginTop: 8, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-display)",
          letterSpacing: 1.5,
          color: "var(--red)",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        Settings
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: subtitle ? 5 : 0 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.5 }}>
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
