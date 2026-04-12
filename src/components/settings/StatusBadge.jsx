import React from "react";

export function StatusBadge({ status }) {
  if (!status) return null;
  const isError = status.startsWith("✕");
  return (
    <div
      style={{
        marginTop: 10,
        fontSize: 13,
        fontWeight: 500,
        color: isError ? "var(--red)" : "#48c774",
      }}
    >
      {status}
    </div>
  );
}
