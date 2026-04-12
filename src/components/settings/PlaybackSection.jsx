import React, { useState } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { DEFAULT_INVIDIOUS_BASE } from "../TrailerModal";
import { Toggle } from "./Toggle";

export const PlaybackSection = React.memo(function PlaybackSection() {
  const [invidiousBase, setInvidiousBase] = useState(
    () => storage.get(STORAGE_KEYS.INVIDIOUS_BASE) || DEFAULT_INVIDIOUS_BASE,
  );
  const [invidiousStatus, setInvidiousStatus] = useState(null);
  const [invidiousChecking, setInvidiousChecking] = useState(false);
  const [invidiousSaved, setInvidiousSaved] = useState(false);

  const [watchedThreshold, setWatchedThreshold] = useState(
    () => storage.get(STORAGE_KEYS.WATCHED_THRESHOLD) ?? 20,
  );
  const [introSkipMode, setIntroSkipMode] = useState(
    () => storage.get(STORAGE_KEYS.INTRO_SKIP_MODE) || "off",
  );
  const [videasyAutoplayNext, setVideasyAutoplayNext] = useState(
    () => !!storage.get(STORAGE_KEYS.VIDEASY_AUTOPLAY_NEXT),
  );
  const [saved, setSaved] = useState(false);

  const checkInvidious = async (baseUrl) => {
    const clean = (baseUrl || "").trim().replace(/\/$/, "");
    if (!clean) {
      setInvidiousStatus({ ok: false, msg: "Please enter a URL first." });
      return;
    }
    setInvidiousChecking(true);
    setInvidiousStatus(null);
    try {
      const url = `${clean}/api/v1/stats`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        setInvidiousStatus({
          ok: true,
          msg: "Instance reachable and responding.",
        });
      } else {
        setInvidiousStatus({
          ok: false,
          msg: `Server responded with status ${res.status}.`,
        });
      }
    } catch (e) {
      setInvidiousStatus({
        ok: false,
        msg: "Could not reach instance. Check the URL or try another.",
      });
    } finally {
      setInvidiousChecking(false);
    }
  };

  const saveInvidiousBase = () => {
    const clean = (invidiousBase || "").trim().replace(/\/$/, "");
    storage.set(STORAGE_KEYS.INVIDIOUS_BASE, clean || DEFAULT_INVIDIOUS_BASE);
    setInvidiousBase(clean || DEFAULT_INVIDIOUS_BASE);
    setInvidiousSaved(true);
    setTimeout(() => setInvidiousSaved(false), 2000);
  };

  const handleSaveThreshold = () => {
    const val = Math.max(1, Math.min(300, Number(watchedThreshold) || 20));
    setWatchedThreshold(val);
    storage.set(STORAGE_KEYS.WATCHED_THRESHOLD, val);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Invidious */}
      <div style={{ marginBottom: 40 }}>
        <div className="settings-section-title">Invidious Instance</div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Trailers are played via <span style={{ color: "var(--text)", fontWeight: 600 }}>Invidious</span>, a privacy-friendly YouTube frontend. Your configured instance is
          tried first; if it fails, the app automatically falls back through a
          list of known working instances. The default is <code style={{ fontSize: 12 }}>{DEFAULT_INVIDIOUS_BASE}</code>. The instance must have its API enabled (<code style={{ fontSize: 12 }}>/api/v1/stats</code> reachable).
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            className="apikey-input"
            style={{ flex: 1, minWidth: 260, marginBottom: 0 }}
            placeholder={DEFAULT_INVIDIOUS_BASE}
            value={invidiousBase}
            onChange={(e) => {
              setInvidiousBase(e.target.value);
              setInvidiousStatus(null);
            }}
          />
          <button
            className="btn btn-ghost"
            disabled={invidiousChecking}
            onClick={() => checkInvidious(invidiousBase)}
            style={{ opacity: invidiousChecking ? 0.5 : 1 }}
          >
            {invidiousChecking ? "Checking…" : "Check"}
          </button>
          <button className="btn btn-primary" onClick={saveInvidiousBase}>
            Save
          </button>
        </div>

        {invidiousStatus && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                flexShrink: 0,
                background: invidiousStatus.ok ? "#48c774" : "#ff3860",
                boxShadow: invidiousStatus.ok
                  ? "0 0 6px rgba(72,199,116,0.6)"
                  : "0 0 6px rgba(255,56,96,0.6)",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: invidiousStatus.ok ? "#48c774" : "#ff3860",
              }}
            >
              {invidiousStatus.msg}
            </span>
          </div>
        )}

        {invidiousSaved && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#48c774" }}>
            ✓ Saved
          </div>
        )}
      </div>

      <hr
        style={{ height: 1, background: "var(--border)", border: "none", marginBottom: 40 }}
      />

      {/* Auto-Watched Threshold */}
      <div style={{ marginBottom: 40 }}>
        <div className="settings-section-title">Auto-Watched Threshold</div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          A movie or episode is automatically marked as <span style={{ color: "#48c774", fontWeight: 600 }}>Watched ✓</span> when the remaining time drops to this value or below. Set between 1 and 300 seconds.
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={1}
              max={300}
              className="apikey-input"
              style={{ width: 90, marginBottom: 0 }}
              value={watchedThreshold}
              onChange={(e) => setWatchedThreshold(e.target.value)}
            />
            <span style={{ fontSize: 14, color: "var(--text2)" }}>seconds</span>
          </div>
          <button className="btn btn-primary" onClick={handleSaveThreshold}>
            Save
          </button>
        </div>
        {saved && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#48c774" }}>
            ✓ Saved
          </div>
        )}
      </div>

      {/* Intro Skip */}
      <div style={{ marginBottom: 40 }}>
        <div className="settings-section-title">Anime Intro Skip</div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Uses <span style={{ color: "var(--text)", fontWeight: 600 }}>AniSkip</span> to detect and skip opening/ending segments. Only active for animes and when using <span style={{ color: "var(--text)", fontWeight: 600 }}>AllManga</span> as source.
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0 16px",
          }}
        >
          {[
            {
              value: "off",
              label: "Off",
              desc: "Intro skip is disabled.",
            },
            {
              value: "auto",
              label: "Auto Skip",
              desc: "Automatically jumps past the intro/outro when reached.",
            },
            {
              value: "manual",
              label: "Manual Skip",
              desc: 'Shows a "Skip Intro" button at the bottom of the player.',
            },
          ].map(({ value, label, desc }, i, arr) => (
            <div
              key={value}
              onClick={() => {
                setIntroSkipMode(value);
                storage.set(STORAGE_KEYS.INTRO_SKIP_MODE, value);
              }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "16px 0",
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
              }}
            >
              {/* Radio dot */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${introSkipMode === value ? "var(--red)" : "var(--border)"}`,
                  background:
                    introSkipMode === value ? "var(--red)" : "transparent",
                  flexShrink: 0,
                  marginTop: 1,
                  boxShadow:
                    introSkipMode === value
                      ? "0 0 0 3px rgba(229,9,20,0.18)"
                      : "none",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {introSkipMode === value && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    marginTop: 3,
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Videasy: autoplay next episode */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
          Videasy — Autoplay Next Episode
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 14, lineHeight: 1.6 }}>
          When using Videasy as the player source, automatically start the next episode when the current one ends.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle
            value={videasyAutoplayNext}
            onChange={(v) => {
              setVideasyAutoplayNext(v);
              storage.set(STORAGE_KEYS.VIDEASY_AUTOPLAY_NEXT, v ? 1 : 0);
            }}
          />
          <span style={{ fontSize: 14, color: "var(--text2)" }}>
            {videasyAutoplayNext ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </div>
  );
});
