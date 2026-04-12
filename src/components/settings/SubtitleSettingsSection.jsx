import React, { useState, useEffect } from "react";
import { storage, STORAGE_KEYS, secureStorage } from "../../utils/storage";
import { SUBTITLE_LANGUAGES } from "../../utils/subtitles";
import { Toggle } from "./Toggle";
import { SettingsSelect } from "./SettingsSelect";

export const SubtitleSettingsSection = React.memo(function SubtitleSettingsSection() {
  const [enabled, setEnabled] = useState(
    () =>
      storage.get(STORAGE_KEYS.SUBTITLE_ENABLED) !== 0 &&
      storage.get(STORAGE_KEYS.SUBTITLE_ENABLED) !== "0",
  );
  const [lang, setLang] = useState(
    () => storage.get(STORAGE_KEYS.SUBTITLE_LANG) || "en",
  );
  const [subdlApiKey, setSubdlApiKey] = useState("");
  const [showSubdlKey, setShowSubdlKey] = useState(false);
  const [wyzieApiKey, setWyzieApiKey] = useState("");
  const [showWyzieKey, setShowWyzieKey] = useState(false);
  const [wyzieCopied, setWyzieCopied] = useState(false);
  const [wyzieRedeeming, setWyzieRedeeming] = useState(false);
  const [wyzieError, setWyzieError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    secureStorage.get(STORAGE_KEYS.SUBDL_API_KEY).then((val) => {
      if (val) setSubdlApiKey(val);
    });
    secureStorage.get(STORAGE_KEYS.WYZIE_API_KEY).then((val) => {
      if (val) setWyzieApiKey(val);
    });
  }, []);

  const hasSubdlKey = subdlApiKey.trim().length > 0;
  const hasWyzieKey = wyzieApiKey.trim().length > 0;

  const handleWyzieRedeem = async () => {
    if (!window.electron) return;
    setWyzieRedeeming(true);
    setWyzieError("");
    try {
      const res = await window.electron.wyzieOpenRedeem();
      if (res.cancelled) {
        setWyzieRedeeming(false);
        return;
      }
      if (res.timeout) {
        setWyzieError(
          "No key received within 10 seconds. Try again or enter it manually.",
        );
        setWyzieRedeeming(false);
        return;
      }
      if (res.ok && res.key) {
        setWyzieApiKey(res.key);
        await secureStorage.set(STORAGE_KEYS.WYZIE_API_KEY, res.key);
        setWyzieError("");
      } else {
        setWyzieError(
          "Could not extract key automatically. Try entering it manually.",
        );
      }
    } catch (e) {
      setWyzieError(e.message);
    }
    setWyzieRedeeming(false);
  };

  const handleWyzieCopy = () => {
    navigator.clipboard.writeText(wyzieApiKey.trim()).then(() => {
      setWyzieCopied(true);
      setTimeout(() => setWyzieCopied(false), 1500);
    });
  };

  const handleSave = () => {
    storage.set(STORAGE_KEYS.SUBTITLE_ENABLED, enabled ? 1 : 0);
    storage.set(STORAGE_KEYS.SUBTITLE_LANG, lang);
    secureStorage.set(STORAGE_KEYS.SUBDL_API_KEY, subdlApiKey.trim());
    secureStorage.set(STORAGE_KEYS.WYZIE_API_KEY, wyzieApiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Subtitle Downloads</div>

      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 20,
          lineHeight: 1.7,
        }}
      >
        <span style={{ color: "var(--text)", fontWeight: 600 }}>
          Wyzie Subs
        </span>{" "}
        is used by default and requires a free API key (no account needed).
        Optionally add a{" "}
        <span
          style={{
            color: "var(--red)",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() =>
            window.electron?.openExternal("https://subdl.com/settings")
          }
        >
          SubDL API key
        </span>{" "}
        (free), to use SubDL as the primary source instead.
        {hasSubdlKey && (
          <span
            style={{
              display: "inline-block",
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 3,
              background: "rgba(99,149,255,0.15)",
              color: "#6395ff",
              border: "1px solid rgba(99,149,255,0.3)",
            }}
          >
            SubDL ACTIVE
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Toggle value={enabled} onChange={setEnabled} />
        <span
          style={{
            fontSize: 14,
            color: enabled ? "var(--text)" : "var(--text3)",
          }}
        >
          {enabled
            ? "Auto-download subtitles when downloading videos"
            : "Subtitle download disabled"}
        </span>
      </div>

      {enabled && (
        <>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
            >
              Default language
            </div>
            <SettingsSelect
              value={lang}
              onChange={(v) => setLang(v)}
              options={SUBTITLE_LANGUAGES.map((l) => ({
                value: l.code,
                label: l.label,
              }))}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
            >
              Wyzie API key{" "}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: hasWyzieKey
                    ? "rgba(99,202,183,0.12)"
                    : "rgba(255,180,80,0.12)",
                  color: hasWyzieKey ? "#63cab7" : "#ffb450",
                  border: `1px solid ${hasWyzieKey ? "rgba(99,202,183,0.25)" : "rgba(255,180,80,0.25)"}`,
                }}
              >
                {hasWyzieKey ? "SET" : "REQUIRED"}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text3)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              Required for Wyzie Subs. Claim a free key, no account needed.
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="apikey-input"
                style={{ flex: 1, maxWidth: 340, marginBottom: 0 }}
                type={showWyzieKey ? "text" : "password"}
                placeholder="wyzie-..."
                value={wyzieApiKey}
                onChange={(e) => setWyzieApiKey(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setShowWyzieKey((v) => !v)}
              >
                {showWyzieKey ? "Hide" : "Show"}
              </button>
              {hasWyzieKey && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={handleWyzieCopy}
                  title="Copy key"
                >
                  {wyzieCopied ? "Copied!" : "Copy"}
                </button>
              )}
              {hasWyzieKey && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() =>
                    window.electron?.openExternal(
                      `https://sub.wyzie.io/notice?key=${wyzieApiKey.trim()}`,
                    )
                  }
                  title="Open notice page for this key"
                >
                  Notice ↗
                </button>
              )}
              {wyzieRedeeming ? (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  Opening redeem page…
                </span>
              ) : !hasWyzieKey ? (
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                  onClick={handleWyzieRedeem}
                >
                  Get free key ↗
                </button>
              ) : null}
            </div>
            {wyzieError && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#ff6060",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,80,80,0.08)",
                  border: "1px solid rgba(255,80,80,0.2)",
                }}
              >
                {wyzieError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
            >
              SubDL API key{" "}
              <span
                style={{
                  color: "var(--text3)",
                  cursor: "pointer",
                  fontSize: 11,
                }}
                onClick={() =>
                  window.electron?.openExternal("https://subdl.com/settings")
                }
              >
                (free, register at subdl.com ↗)
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "rgba(99,202,183,0.12)",
                  color: "#63cab7",
                  border: "1px solid rgba(99,202,183,0.25)",
                }}
              >
                OPTIONAL
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text3)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              Leave empty to use{" "}
              <strong style={{ color: "var(--text)" }}>Wyzie Subs</strong>{" "}
              (default, requires Wyzie API key above). Add a SubDL key to switch
              to SubDL as the primary source.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="apikey-input"
                style={{ flex: 1, maxWidth: 400, marginBottom: 0 }}
                type={showSubdlKey ? "text" : "password"}
                placeholder="SubDL API key, leave empty to use Wyzie"
                value={subdlApiKey}
                onChange={(e) => setSubdlApiKey(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setShowSubdlKey((v) => !v)}
              >
                {showSubdlKey ? "Hide" : "Show"}
              </button>
              {subdlApiKey.trim() && (
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    color: "var(--text3)",
                  }}
                  onClick={() => setSubdlApiKey("")}
                  title="Clear key (revert to Wyzie)"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          Save
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#4caf50" }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
});
