import React from "react";
import { WarningIcon } from "../Icons";

export function ResetConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Warning icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(229,9,20,0.12)",
            border: "1px solid rgba(229,9,20,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <WarningIcon size={24} />
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          RESET STREAMBERT?
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text2)",
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          This will permanently delete all your settings, watch history, saved
          titles, progress data, and cached data. Your downloaded video files
          will{" "}
          <span style={{ color: "var(--text)", fontWeight: 600 }}>not</span> be
          deleted.
          <br />
          <br />
          <span style={{ color: "var(--red)" }}>
            This action cannot be undone.
          </span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              background: "var(--red)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
            }}
            onClick={onConfirm}
          >
            Yes, Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(229,9,20,0.12)",
            border: "1px solid rgba(229,9,20,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <WarningIcon size={24} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text2)",
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          {description}
          <br />
          <br />
          <span style={{ color: "var(--red)" }}>
            This action cannot be undone.
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn"
            style={{
              flex: 1,
              background: "var(--red)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
