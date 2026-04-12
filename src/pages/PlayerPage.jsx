import { useEffect, useCallback, useState, useRef } from "react";
import { getSourceUrl, sourceSupportsProgress, sourceIsAsync, PLAYER_SOURCES } from "../utils/api";
import { storage } from "../utils/storage";
import { SourceIcon, ShieldBlockIcon, DownloadIcon } from "../components/Icons";
import CustomPlayer from "../components/CustomPlayer";

export default function PlayerPage({
  media,
  onBack,
  onShowDownload,
}) {
  const [playerSource, setPlayerSource] = useState(() => media?.source || storage.get("playerSource") || "vidsrc");
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [dubMode, setDubMode] = useState(() => storage.get("allmangaDubMode") || "sub");
  const [menuPos, setMenuPos] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(null);
  const sourceRef = useRef(null);
  const hideTimerRef = useRef(null);

  const isAsync = sourceIsAsync(playerSource);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-player-fullscreen", "1");
    resetHideTimer();
    return () => {
      document.documentElement.removeAttribute("data-player-fullscreen");
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      if (!showSourceMenu) resetHideTimer();
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [resetHideTimer, showSourceMenu]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        onBack?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack]);

  useEffect(() => {
    if (!media) return;
    setResolvedUrl(null);
    setError(null);

    if (!isAsync || playerSource !== "allmanga") {
      return;
    }

    setResolving(true);
    window.electron
      .resolveAllManga({
        title: media.title || media.name,
        seasonNumber: media.season || 1,
        episodeNumber: media.episode || 1,
        isMovie: media.mediaType === "movie",
        translationType: dubMode,
      })
      .then((res) => {
        console.log("resolveAllManga response:", res);
        if (res?.ok && res.url) {
          setResolvedUrl(res.url);
        } else {
          setError("Movie not found on AllManga");
        }
      })
      .catch((e) => {
        console.error("resolveAllManga error:", e);
        setError("Failed to load video");
      })
      .finally(() => {
        setResolving(false);
      });
  }, [media, playerSource, dubMode, isAsync]);

  useEffect(() => {
    if (!showSourceMenu) return;
    const close = () => setShowSourceMenu(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    const handleClick = (e) => {
      if (sourceRef.current?.contains(e.target) || e.target.closest(".source-dropdown")) return;
      close();
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showSourceMenu]);

  const handleSourceChange = (src) => {
    setShowSourceMenu(false);
    if (src.id === playerSource) return;
    setPlayerSource(src.id);
    setResolvedUrl(null);
    setError(null);
    storage.set("playerSource", src.id);
  };

  if (!media) return null;

  const urlLower = resolvedUrl?.toLowerCase() || "";
  const useCustomPlayer = playerSource === "allmanga" && resolvedUrl && urlLower.endsWith(".m3u8");
  const useNativeVideo = playerSource === "allmanga" && resolvedUrl && (urlLower.endsWith(".mp4") || urlLower.includes(".mp4"));
  const webviewSrc = !isAsync
    ? getSourceUrl(playerSource, media.mediaType, media.tmdbId, media.season, media.episode)
    : null;

  console.log("resolvedUrl:", resolvedUrl, "urlLower:", urlLower, "useNativeVideo:", useNativeVideo);

  return (
    <div className="player-page">
      <div className={`player-page-header ${showControls ? "" : "player-page-header--hidden"}`}>
        <button className="player-page-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="player-page-title">
          {media.title || media.name}
        </div>
        <div className="player-page-controls">
          <button
            ref={sourceRef}
            className="player-overlay-btn"
            onClick={() => {
              const rect = sourceRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ top: rect.bottom + 6, left: rect.left });
              setShowSourceMenu((v) => !v);
            }}
            title="Change source"
          >
            <SourceIcon />
            <span style={{ marginLeft: 6 }}>{PLAYER_SOURCES.find((s) => s.id === playerSource)?.label ?? "Source"}</span>
          </button>
          {playerSource === "allmanga" && (
            <button
              className="player-overlay-btn"
              onClick={() => {
                const next = dubMode === "sub" ? "dub" : "sub";
                setDubMode(next);
                storage.set("allmangaDubMode", next);
                setResolvedUrl(null);
                setError(null);
              }}
              title="Toggle Sub/Dub"
            >
              {dubMode === "sub" ? "SUB" : "DUB"}
            </button>
          )}
          <button
            className="player-overlay-btn"
            onClick={() => setShowSourceMenu(false)}
            title="Blocked ads & trackers"
          >
            <ShieldBlockIcon />
          </button>
          <button
            className="player-overlay-btn"
            onClick={() => setShowSourceMenu(false)}
            title="Download"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>

      {showSourceMenu && menuPos && (
        <div
          className="source-dropdown source-dropdown--fixed"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {PLAYER_SOURCES.map((src) => (
            <button
              key={src.id}
              className={"source-dropdown__item" + (playerSource === src.id ? " source-dropdown__item--active" : "")}
              onClick={() => handleSourceChange(src)}
            >
              <span>{src.label}</span>
              {src.tag && <span className="source-dropdown__tag">{src.tag}</span>}
              {src.note && <span className="source-dropdown__note">{src.note}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="player-page-content">
        {console.log("Rendering:", { error, resolving, useCustomPlayer, useNativeVideo, webviewSrc, resolvedUrl })}
        {error ? (
          <div style={{ color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <span>{error}</span>
            <span style={{ fontSize: 12, color: "#888" }}>Try a different source</span>
          </div>
        ) : resolving ? (
          <div style={{ color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Loading...
          </div>
        ) : useCustomPlayer ? (
          <CustomPlayer
            src={resolvedUrl}
            subtitles={media.subtitles || []}
            startAt={media.startAt || 0}
          />
        ) : useNativeVideo ? (
          <video
            src={resolvedUrl}
            controls
            autoPlay
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "black" }}
          />
        ) : webviewSrc ? (
          <webview
            src={webviewSrc}
            partition="persist:player"
            allowpopups="false"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}