import { useEffect, useCallback, useState, useRef } from "react";
import { getSourceUrl, sourceSupportsProgress, sourceIsAsync, PLAYER_SOURCES } from "../utils/api";
import { storage } from "../utils/storage";
import { SourceIcon, ShieldBlockIcon, DownloadIcon, VolumeBoostIcon } from "../components/Icons";
import CustomPlayer from "../components/CustomPlayer";

export default function PlayerPage({
  media,
  onBack,
  onShowDownload,
  onSaveProgress,
  onMarkWatched,
}) {
  const [playerSource, setPlayerSource] = useState(() => media?.source || storage.get("playerSource") || "vidsrc");
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [dubMode, setDubMode] = useState(() => storage.get("allmangaDubMode") || "sub");
  const [menuPos, setMenuPos] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(null);
  const [audioBoost, setAudioBoost] = useState(() => storage.get("audioBoost") === "true");
  const sourceRef = useRef(null);
  const hideTimerRef = useRef(null);
  const webviewRef = useRef(null);
  const lastKnownTimeRef = useRef(0);

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
    let mounted = true;
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
        if (!mounted) return;
        console.log("resolveAllManga response:", res);
        if (res?.ok && res.url) {
          if (res.isDirectMp4) {
            const progressKey = media.progressKey || `${media.mediaType}_${media.tmdbId}`;
            const startTime = storage.get("dlTime_" + progressKey) || 0;
            window.electron
              .setPlayerVideo({
                url: res.url,
                referer: res.referer || "https://allmanga.to",
                startTime,
              })
              .then((r) => {
                if (!mounted) return;
                const proxyUrl = r.playerUrl.replace("/player", "/proxy") + "?url=" + encodeURIComponent(res.url);
                setResolvedUrl(proxyUrl);
              })
              .catch(() => {
                if (mounted) setError("Failed to start player");
              });
          } else {
            setResolvedUrl(res.url);
          }
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
    return () => {
      mounted = false;
    };
  }, [media, playerSource, dubMode, isAsync]);

  useEffect(() => {
    if (!showSourceMenu) return;
    const close = (e) => {
      if (e?.target?.closest?.(".source-dropdown")) return;
      setShowSourceMenu(false);
    };
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
  
  const toggleAudioBoost = useCallback(async () => {
    const next = !audioBoost;
    setAudioBoost(next);
    storage.set("audioBoost", next ? "true" : "false");
    
    const wv = webviewRef.current;
    if (!wv) return;
    
    try {
      if (next) {
        await wv.executeJavaScript(`
          (async () => {
            const boostAudio = (v) => {
              if (!v || v._boosted) return;
              try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                const source = ctx.createMediaElementSource(v);
                const gainNode = ctx.createGain();
                gainNode.gain.value = 2.5; // 250% boost
                source.connect(gainNode);
                gainNode.connect(ctx.destination);
                v._boosted = true;
                v._gainNode = gainNode;
                console.log('Audio boosted for:', v);
              } catch (e) {
                console.error('Audio boost failed:', e);
              }
            };
            
            // Boost all current videos
            document.querySelectorAll('video').forEach(boostAudio);
            
            // Watch for new videos (some players swap elements)
            if (!window._boostObserver) {
              window._boostObserver = new MutationObserver((mutations) => {
                mutations.forEach((m) => {
                  m.addedNodes.forEach((node) => {
                    if (node.nodeName === 'VIDEO') boostAudio(node);
                    if (node.querySelectorAll) node.querySelectorAll('video').forEach(boostAudio);
                  });
                });
              });
              window._boostObserver.observe(document.body, { childList: true, subtree: true });
            }
          })()
        `);
      } else {
        await wv.executeJavaScript(`
          (() => {
            document.querySelectorAll('video').forEach(v => {
              if (v._gainNode) {
                v._gainNode.gain.value = 1.0;
              }
            });
          })()
        `);
      }
    } catch (e) {}
  }, [audioBoost]);

  if (!media) return null;

  const urlLower = resolvedUrl?.toLowerCase() || "";
  const isAllManga = playerSource === "allmanga" && resolvedUrl;
  const useCustomPlayer = isAllManga && (urlLower.endsWith(".m3u8") || urlLower.includes(".m3u8") || urlLower.includes("/proxy"));
  const webviewSrc = !isAsync
    ? getSourceUrl(playerSource, media.mediaType, media.tmdbId, media.season, media.episode, media.anilistId)
    : (!useCustomPlayer ? resolvedUrl : null);

  // ── Progress & Message tracking ──────────────────────────────────────────
  useEffect(() => {
    if (!media || !webviewSrc) return;
    let active = true;
    const progressKey = media.progressKey || `${media.mediaType}_${media.tmdbId}`;
    let interval = null;

    const setupBridge = async () => {
      if (!active) return;
      const wv = webviewRef.current;
      if (!wv) return;

      // Videasy message bridge
      if (playerSource === "videasy") {
        try {
          await wv.executeJavaScript(`
            window.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                window.stoneback.sendToHost('videasy-message', data);
              } catch(e) {}
            });
          `);
        } catch (e) {}
      }

      // VidFast message bridge
      if (playerSource === "vidfast") {
        try {
          await wv.executeJavaScript(`
            const vidfastOrigins = [
              'https://vidfast.pro', 'https://vidfast.in', 'https://vidfast.io',
              'https://vidfast.me', 'https://vidfast.net', 'https://vidfast.pm', 'https://vidfast.xyz'
            ];
            window.addEventListener('message', (event) => {
              if (!vidfastOrigins.includes(event.origin) || !event.data) return;
              window.stoneback.sendToHost('vidfast-message', event.data);
            });
          `);
        } catch (e) {}
      }
      
      // Auto-apply audio boost if enabled
      if (storage.get("audioBoost") === "true") {
        try {
          await wv.executeJavaScript(`
            (() => {
              const boostAudio = (v) => {
                if (!v || v._boosted) return;
                try {
                  const AudioContext = window.AudioContext || window.webkitAudioContext;
                  if (!AudioContext) return;
                  const ctx = new AudioContext();
                  const source = ctx.createMediaElementSource(v);
                  const gainNode = ctx.createGain();
                  gainNode.gain.value = 2.5;
                  source.connect(gainNode);
                  gainNode.connect(ctx.destination);
                  v._boosted = true;
                  v._gainNode = gainNode;
                } catch (e) {}
              };
              document.querySelectorAll('video').forEach(boostAudio);
              if (!window._boostObserver) {
                window._boostObserver = new MutationObserver((mutations) => {
                  mutations.forEach((m) => {
                    m.addedNodes.forEach((node) => {
                      if (node.nodeName === 'VIDEO') boostAudio(node);
                      if (node.querySelectorAll) node.querySelectorAll('video').forEach(boostAudio);
                    });
                  });
                });
                window._boostObserver.observe(document.body, { childList: true, subtree: true });
              }
            })()
          `);
        } catch (e) {}
      }
    };

    const handleIpc = (e) => {
      if (e.channel === "videasy-message") {
        const data = e.args[0];
        if (data.event === "progress") {
          const { currentTime, duration } = data.data;
          const p = Math.floor((currentTime / duration) * 100);
          onSaveProgress?.(progressKey, Math.min(p, 100));
          storage.set("dlTime_" + progressKey, Math.floor(currentTime));
          if (duration - currentTime < 30) {
            onMarkWatched?.(progressKey);
          }
        } else if (data.event === "episode_changed") {
          // Future: Update media state if needed
          console.log("Videasy episode changed:", data.data);
        }
      }

      if (e.channel === "vidfast-message") {
        const data = e.args[0];
        if (data.type === 'PLAYER_EVENT') {
          const { event, currentTime, duration } = data.data;
          // Most sources use timeupdate for periodic updates
          if (event === 'timeupdate' || event === 'play' || event === 'pause') {
            const p = Math.floor((currentTime / duration) * 100);
            onSaveProgress?.(progressKey, Math.min(p, 100));
            storage.set("dlTime_" + progressKey, Math.floor(currentTime));
            if (duration - currentTime < 30) {
              onMarkWatched?.(progressKey);
            }
          }
        }
      }
    };

    const poll = async () => {
      if (!active) return;
      const wv = webviewRef.current;
      if (!wv || playerSource === "videasy" || playerSource === "vidfast") return; // Videasy/VidFast use messages
      try {
        const result = await wv.executeJavaScript(`
          (() => {
            const v = document.querySelector('video');
            if (!v || !v.duration || v.duration === Infinity || v.paused) return null;
            return { currentTime: v.currentTime, duration: v.duration };
          })()
        `);
        if (result && result.duration > 0) {
          const ct = result.currentTime;
          const p = Math.floor((ct / result.duration) * 100);
          onSaveProgress?.(progressKey, Math.min(p, 100));
          storage.set("dlTime_" + progressKey, Math.floor(ct));
          if (result.duration - ct < 30) {
            onMarkWatched?.(progressKey);
          }
        }
      } catch (e) {}
    };

    const wv = webviewRef.current;
    if (wv) {
      wv.addEventListener("did-finish-load", setupBridge);
      wv.addEventListener("ipc-message", handleIpc);
      interval = setInterval(poll, 5000);
    }

    return () => {
      active = false;
      if (wv) {
        wv.removeEventListener("did-finish-load", setupBridge);
        wv.removeEventListener("ipc-message", handleIpc);
      }
      if (interval) clearInterval(interval);
    };
  }, [media, webviewSrc, playerSource]);

  useEffect(() => {
    return () => {
      window.electron?.playerStopped?.();
    };
  }, []);

  return (
    <div className="player-page">
      <div className="player-drag-handle" />
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
            onClick={toggleAudioBoost}
            title={audioBoost ? "Disable Audio Boost" : "Enable Audio Boost (250%)"}
            style={{ color: audioBoost ? "#ff4d4d" : "inherit" }}
          >
            <VolumeBoostIcon active={audioBoost} />
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
            audioBoost={audioBoost}
          />
        ) : webviewSrc ? (
          <webview
            key={playerSource}
            ref={webviewRef}
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