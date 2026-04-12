import React, { useState, useEffect } from "react";
import UpdateModal from "../UpdateModal";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { checkForUpdates } from "../../utils/updates";
import { Toggle } from "./Toggle";

export const VersionSection = React.memo(function VersionSection() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { latest, current, url, hasUpdate } | { error }
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [autoCheck, setAutoCheck] = useState(() => {
    const stored = storage.get(STORAGE_KEYS.AUTO_CHECK_UPDATES);
    return stored === null || stored === undefined ? true : !!stored;
  });
  const [autoSaved, setAutoSaved] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("0.0.0");

  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then((v) => {
        setCurrentVersion(v);
      });
    }
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const r = await checkForUpdates();
      setResult(r);
    } catch (e) {
      setResult({ error: e.message || "Could not reach GitHub." });
    } finally {
      setChecking(false);
    }
  };

  const toggleAuto = (val) => {
    setAutoCheck(val);
    storage.set(STORAGE_KEYS.AUTO_CHECK_UPDATES, val ? 1 : 0);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 1800);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">App Version</div>

      {/* Version row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>
            Current version
          </span>
          <code
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 12px",
            }}
          >
            v{currentVersion}
          </code>
        </div>

        <button
          className="btn btn-ghost"
          disabled={checking}
          onClick={runCheck}
          style={{ opacity: checking ? 0.6 : 1 }}
        >
          {checking ? "Checking…" : "Check for Updates"}
        </button>

        {result && !result.error && result.hasUpdate && (
          <button
            onClick={() => setShowUpdateModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(229,9,20,0.12)",
              border: "1px solid rgba(229,9,20,0.4)",
              color: "var(--red)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(229,9,20,0.22)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(229,9,20,0.12)")
            }
          >
            🎉 v{result.latest} available. Install Update
          </button>
        )}

        {result && !result.error && !result.hasUpdate && (
          <span style={{ fontSize: 13, color: "#48c774", fontWeight: 500 }}>
            ✓ You're up to date
          </span>
        )}

        {result?.error && (
          <span style={{ fontSize: 13, color: "var(--red)" }}>
            ✕ {result.error}
          </span>
        )}
      </div>

      {showUpdateModal && result?.hasUpdate && (
        <UpdateModal
          updateInfo={result}
          onClose={() => setShowUpdateModal(false)}
        />
      )}

      {/* Auto-check toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Toggle
          value={autoCheck}
          onChange={toggleAuto}
          title={autoCheck ? "Disable auto-check" : "Enable auto-check"}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            Check for updates on startup
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            Shows a notification banner if a new version is available. Turned on
            by default.
          </div>
        </div>
        {autoSaved && (
          <span style={{ fontSize: 12, color: "#48c774" }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
});
