import React from "react";

export function Toggle({ value, onChange, title }) {
  return (
    <button
      onClick={() => onChange(!value)}
      title={title}
      style={{
        background: value ? "var(--red)" : "var(--surface2)",
        border: "1px solid " + (value ? "var(--red)" : "var(--border)"),
        borderRadius: 20,
        width: 40,
        height: 22,
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 20 : 2,
          width: 16,
          height: 16,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}
