import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { storage } from "../utils/storage";

export const DEFAULT_INVIDIOUS_BASE = "https://invidious.fdn.fr";

function formatTime(s) {
  s = Math.round(s || 0);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function TrailerModal({ trailerKey, title, onClose }) {
  const accentColor = useMemo(() => storage.get("accentColor") || "#e50914", []);
  const GOLD = accentColor;
  const WHITE = "var(--text)";
  const MUTED = "var(--text3)";
  const BG = "var(--bg)";
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showCenterPop, setShowCenterPop] = useState(false);
  
  const hideTimerRef = useRef(null);
  const lastClickRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    if (playingRef.current) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2800);
    }
  }, []);

  const showControlsFn = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const onPlayerReady = useCallback(() => {
    setPlayerReady(true);
    setLoading(false);
    const player = playerRef.current;
    if (player && typeof player.setVolume === "function") {
      player.setVolume(volume);
      if (typeof player.playVideo === "function") {
        player.playVideo();
      }
    }
    scheduleHide();
  }, [volume, scheduleHide]);

  const onPlayerStateChange = useCallback((state) => {
    if (state === 1) {
      playingRef.current = true;
      setPlaying(true);
      const player = playerRef.current;
      if (player && typeof player.getDuration === "function") {
        const dur = player.getDuration() || 0;
        durationRef.current = dur;
        setDuration(dur);
      }
    } else if (state === 2 || state === 0) {
      playingRef.current = false;
      setPlaying(false);
      showControlsFn();
    }
  }, [showControlsFn]);

  const onPlayerError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerReady || !playerRef.current) return;
    const player = playerRef.current;
    const isPlaying = playingRef.current;
    if (isPlaying) {
      if (typeof player.pauseVideo === "function") player.pauseVideo();
    } else {
      if (typeof player.playVideo === "function") player.playVideo();
    }
    playingRef.current = !isPlaying;
    setPlaying(!isPlaying);
    setShowCenterPop(true);
    setTimeout(() => setShowCenterPop(false), 600);
    showControlsFn();
  }, [playerReady, showControlsFn]);

  const seekBy = useCallback((seconds) => {
    if (!playerReady || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.seekTo !== "function") return;
    const newTime = Math.max(0, Math.min(durationRef.current, currentTimeRef.current + seconds));
    player.seekTo(newTime, true);
    showControlsFn();
  }, [playerReady, showControlsFn]);

  const toggleMute = useCallback(() => {
    if (!playerReady || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.setVolume !== "function") return;
    const newMuted = !muted;
    if (newMuted) {
      player.setVolume(0);
    } else {
      player.setVolume(100);
    }
    setMuted(newMuted);
    showControlsFn();
  }, [playerReady, muted, showControlsFn]);

  const setVolumeLevel = useCallback((val) => {
    if (!playerReady || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.setVolume !== "function") return;
    lastVolumeRef.current = val;
    setVolume(val);
    player.setVolume(val);
    if (val === 0 && !muted) {
      setMuted(true);
      if (typeof player.mute === "function") player.mute();
    } else if (val > 0 && muted) {
      setMuted(false);
      if (typeof player.unmute === "function") player.unmute();
    }
  }, [playerReady, muted]);

  const toggleFullscreen = useCallback(() => {
    const wrap = document.getElementById("trailer-wrap");
    if (!document.fullscreenElement) {
      wrap?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const handleSeek = useCallback((e) => {
    if (!playerReady || !durationRef.current || !playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.seekTo !== "function") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seekTo(pct * durationRef.current, true);
    showControlsFn();
  }, [playerReady, showControlsFn]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (!playerReady) return;
      const t = e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "f") {
        toggleFullscreen();
      } else if (e.key === "m") {
        toggleMute();
      } else if (e.key === "j" || e.key === "ArrowLeft") {
        seekBy(-10);
      } else if (e.key === "l" || e.key === "ArrowRight") {
        seekBy(10);
      } else if (e.key === "ArrowUp") {
        setVolumeLevel(Math.min(100, volume + 10));
      } else if (e.key === "ArrowDown") {
        setVolumeLevel(Math.max(0, volume - 10));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, playerReady, togglePlay, toggleFullscreen, toggleMute, seekBy, setVolumeLevel, volume]);

  useEffect(() => {
    let mounted = true;

    const container = document.getElementById("yt-player");
    if (!container) return;

    const createPlayer = () => {
      if (!mounted || !window.YT || !window.YT.Player) return;
      
      try {
        playerRef.current = new window.YT.Player("yt-player", {
          videoId: trailerKey,
          playerVars: {
            autoplay: 1,
            controls: 0,
            showinfo: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            fs: 0,
            cc_load_policy: 0,
            enablejsapi: 1,
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: (e) => onPlayerStateChange(e.data),
            onError: onPlayerError,
          },
        });
      } catch (e) {
        console.error("YouTube player creation failed:", e);
        setError(true);
        setLoading(false);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        if (mounted) createPlayer();
      };

      if (!document.getElementById("youtube-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }

      const poll = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(poll);
          createPlayer();
        }
      }, 100);
    }

    return () => {
      mounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
    };
  }, [trailerKey, onPlayerReady, onPlayerStateChange, onPlayerError]);

  useEffect(() => {
    if (!playerReady) return;
    let frameId;
    let lastUpdate = 0;
    
    const tick = (timestamp) => {
      if (!playerRef.current) return;
      const player = playerRef.current;
      
      if (timestamp - lastUpdate > 250) {
        lastUpdate = timestamp;
        
        try {
          const state = player.getPlayerState?.();
          if (state === 1) {
            const ct = player.getCurrentTime?.() || 0;
            const dur = player.getDuration?.() || 0;
            const buf = player.getVideoLoadedFraction?.() || 0;
            
            if (ct !== currentTimeRef.current) {
              currentTimeRef.current = ct;
              setCurrentTime(ct);
            }
            if (dur !== durationRef.current && dur > 0) {
              durationRef.current = dur;
              setDuration(dur);
            }
            setBuffered(buf * 100);
          }
        } catch {}
      }
      
      frameId = requestAnimationFrame(tick);
    };
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playerReady]);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 280) return;
    lastClickRef.current = now;
    togglePlay();
  };

  const handleDoubleClick = () => {
    toggleFullscreen();
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="trailer-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'SF Pro Display','Helvetica Neue',Arial,sans-serif",
        userSelect: "none",
      }}
    >
      <div
        id="trailer-wrap"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#000",
          cursor: "pointer",
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={showControlsFn}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: BG,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              opacity: loading ? 1 : 0,
              pointerEvents: loading ? "auto" : "none",
              transition: "opacity 0.5s",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                border: `2px solid color-mix(in srgb, var(--gold) 20%, transparent)`,
                borderTopColor: GOLD,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 11, letterSpacing: ".13em", textTransform: "uppercase", color: MUTED }}>
              Loading Trailer
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: 0,
              zIndex: 40,
              background: BG,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <strong style={{ color: WHITE, fontSize: 17 }}>Playback unavailable</strong>
            <p style={{ fontSize: 14, color: MUTED }}>This trailer cannot be loaded right now.</p>
          </div>
        )}

        <div
          id="yt-player"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
          }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%,-50%) scale(${showCenterPop ? 1 : 0})`,
            zIndex: 15,
            width: 70,
            height: 70,
            background: "rgba(0,0,0,0.6)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: showCenterPop ? 1 : 0,
            transition: "transform 0.12s ease, opacity 0.22s ease",
            pointerEvents: "none",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill={WHITE}>
            {playing ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: "22px 28px 70px",
            background: "linear-gradient(rgba(0,0,0,0.7),transparent)",
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? "auto" : "none",
            transition: "opacity 0.35s",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: ".03em", textShadow: "0 1px 10px rgba(0,0,0,0.9)", color: WHITE }}>
            {title}
          </div>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: GOLD, marginTop: 4 }}>
            Official Trailer
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: "0 22px 18px",
            background: "linear-gradient(transparent,rgba(0,0,0,0.88) 55%)",
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? "auto" : "none",
            transition: "opacity 0.35s",
          }}
        >
          <div
            style={{
              position: "relative",
              height: 4,
              marginBottom: 12,
              cursor: "pointer",
            }}
            onClick={handleSeek}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: "auto",
                  background: "rgba(255,255,255,0.25)",
                  width: `${buffered}%`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: "auto",
                  background: GOLD,
                  width: `${pct}%`,
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              style={{
                background: "none",
                border: "none",
                color: WHITE,
                cursor: "pointer",
                padding: 8,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Play/Pause (Space)"
            >
              {playing ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                seekBy(-10);
              }}
              style={{
                background: "none",
                border: "none",
                color: WHITE,
                cursor: "pointer",
                padding: 8,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Back 10s (J)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              </svg>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                seekBy(10);
              }}
              style={{
                background: "none",
                border: "none",
                color: WHITE,
                cursor: "pointer",
                padding: 8,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Forward 10s (L)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
              </svg>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMute();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: WHITE,
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Mute (M)"
              >
                {muted || volume === 0 ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
            </div>

            <div style={{ fontSize: 12.5, color: MUTED, letterSpacing: ".04em", padding: "0 6px" }}>
              <span style={{ color: WHITE }}>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
            </div>

            <div style={{ flex: 1 }} />

            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: ".1em",
                color: GOLD,
                border: `1px solid color-mix(in srgb, var(--gold) 40%, transparent)`,
                padding: "2px 7px",
                borderRadius: 3,
              }}
            >
              HD
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              style={{
                background: "none",
                border: "none",
                color: WHITE,
                cursor: "pointer",
                padding: 8,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Fullscreen (F)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Back"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border)",
            color: "var(--text2)",
            cursor: "pointer",
            padding: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? "auto" : "none",
            transition: "opacity 0.35s",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}