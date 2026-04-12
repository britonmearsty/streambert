import {
  useState, useEffect, useRef, useMemo, useCallback,
  useLayoutEffect, memo,
} from "react";
import { storage } from "../utils/storage";
import { PlayIcon, LoaderIcon } from "../components/Icons";
import CustomPlayer from "../components/CustomPlayer";
import "../components/CustomPlayer.css";

const STORAGE_KEY = "iptvPlaylists";
const STORAGE_FAV = "iptvFavorites";
const ROW_HEIGHT  = 64;
const OVERSCAN    = 8;

const DEFAULT_PLAYLIST = {
  id: "__iptv_org__",
  name: "IPTV-org",
  url: "https://iptv-org.github.io/iptv/index.m3u",
  builtin: true,
  channels: [],
};

// ── In-memory M3U cache (session-scoped) ───────────────────────────────────────
const _m3uCache = new Map(); // url → { channels, expiresAt, ts }
const M3U_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const _maxCacheEntries = 10;

function _getM3UCached(url) {
  const cached = _m3uCache.get(url);
  if (cached && Date.now() < cached.expiresAt) return cached.channels;
  return null;
}

function _setM3UCached(url, channels) {
  _m3uCache.set(url, { channels, expiresAt: Date.now() + M3U_CACHE_TTL, ts: Date.now() });
  if (_m3uCache.size > _maxCacheEntries) {
    const now = Date.now();
    for (const [k, v] of _m3uCache) {
      if (now >= v.expiresAt) _m3uCache.delete(k);
    }
  }
}

function _isM3UStale(url) {
  const cached = _m3uCache.get(url);
  if (!cached) return true;
  const staleThreshold = cached.ts + (M3U_CACHE_TTL * 1.5);
  return Date.now() > staleThreshold;
}

// ── Parse M3U in async chunks ─────────────────────────────────────────────────
function parseM3UAsync(text) {
  return new Promise((resolve) => {
    const lines = text.split(/\r?\n/);
    const channels = [];
    let current = null;
    let i = 0;
    const CHUNK = 2000;
    function processChunk() {
      const end = Math.min(i + CHUNK, lines.length);
      for (; i < end; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXTINF")) {
          const nameMatch  = line.match(/,(.+)$/);
          const logoMatch  = line.match(/tvg-logo="([^"]*)"/i);
          const groupMatch = line.match(/group-title="([^"]*)"/i);
          current = {
            name:  nameMatch  ? nameMatch[1].trim() : "Unknown",
            logo:  logoMatch  ? logoMatch[1]        : null,
            group: groupMatch ? groupMatch[1]        : "General",
            url: null,
          };
        } else if (line && !line.startsWith("#") && current) {
          current.url = line;
          current.id  = line;
          channels.push(current);
          current = null;
        }
      }
      if (i < lines.length) setTimeout(processChunk, 0);
      else resolve(channels);
    }
    setTimeout(processChunk, 0);
  });
}

async function fetchM3U(url) {
  // Check cache first
  const cached = _getM3UCached(url);
  if (cached) return cached;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const channels = await parseM3UAsync(await res.text());
  _setM3UCached(url, channels);
  return channels;
}

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ── Virtual list ──────────────────────────────────────────────────────────────
function VirtualChannelList({ channels, favorites, onPlay, onToggleFav }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop]   = useState(0);
  const [viewHeight, setViewHeight] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback((e) => setScrollTop(e.currentTarget.scrollTop), []);

  const totalHeight = channels.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx   = Math.min(channels.length, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN);
  const visible  = channels.slice(startIdx, endIdx);
  const offsetY  = startIdx * ROW_HEIGHT;

  return (
    <div ref={containerRef} className="iptv-channels" onScroll={onScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: offsetY, left: 0, right: 0 }}>
          {visible.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              isFav={favorites.has(ch.id)}
              onPlay={onPlay}
              onToggleFav={onToggleFav}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IPTVPage({ onBack }) {
  const [playlists, setPlaylists] = useState(() => {
    const saved = storage.get(STORAGE_KEY) || [];
    const hasDefault = saved.some((p) => p.id === DEFAULT_PLAYLIST.id);
    return hasDefault ? saved : [DEFAULT_PLAYLIST, ...saved];
  });
  const [favorites, setFavorites] = useState(() => new Set(storage.get(STORAGE_FAV) || []));
  const [activePlaylist, setActivePlaylist] = useState(DEFAULT_PLAYLIST.id);
  const [search, setSearch]           = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [playing, setPlaying]         = useState(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [addName, setAddName]         = useState("");
  const [addUrl, setAddUrl]           = useState("");
  const [addLoading, setAddLoading]   = useState(false);
  const [addError, setAddError]       = useState(null);
  const [builtinLoading, setBuiltinLoading] = useState(false);
  const [builtinError, setBuiltinError]     = useState(null);
  const webviewRef  = useRef(null);
  const searchRef   = useRef(null);
  const debouncedSearch = useDebounce(search, 200);

  useEffect(() => {
    storage.set(STORAGE_KEY, playlists.map((p) => p.builtin ? { ...p, channels: [] } : p));
  }, [playlists]);
  useEffect(() => { storage.set(STORAGE_FAV, [...favorites]); }, [favorites]);

  // Fetch built-in playlist (with stale-while-revalidate)
  useEffect(() => {
    const builtin = playlists.find((p) => p.id === DEFAULT_PLAYLIST.id);
    const hasExisting = builtin?.channels.length > 0;
    const isStale = _isM3UStale(DEFAULT_PLAYLIST.url);
    
    // Show loading only if no existing data
    if (!hasExisting) setBuiltinLoading(true);
    setBuiltinError(null);

    // If we have existing data but it's stale, continue showing it while fetching
    fetchM3U(DEFAULT_PLAYLIST.url)
      .then((channels) => {
        setPlaylists((prev) => prev.map((p) => p.id === DEFAULT_PLAYLIST.id ? { ...p, channels } : p));
      })
      .catch((e) => {
        // Only show error if we have no existing data
        if (!hasExisting) setBuiltinError(e.message || "Failed to load");
      })
      .finally(() => {
        setBuiltinLoading(false);
      });
  }, []);

  // Player fullscreen
  useEffect(() => {
    if (playing) {
      document.documentElement.setAttribute("data-player-fullscreen", "1");
    } else {
      document.documentElement.removeAttribute("data-player-fullscreen");
    }
  }, [playing]);

  useLayoutEffect(() => {
    if (playing) return;
    const wv = webviewRef.current;
    if (wv) { try { wv.src = "about:blank"; } catch {} }
  }, [playing]);

  useEffect(() => () => {
    document.documentElement.removeAttribute("data-player-fullscreen");
    window.electron?.playerStopped?.();
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { playing ? setPlaying(null) : onBack?.(); return; }
      // Ctrl+F / Cmd+F focuses search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [playing, onBack]);

  const currentPlaylist = useMemo(
    () => playlists.find((p) => p.id === activePlaylist) || null,
    [playlists, activePlaylist],
  );

  const groups = useMemo(() => {
    if (!currentPlaylist?.channels.length) return [];
    const g = new Set(currentPlaylist.channels.map((c) => c.group));
    return ["All", "Favorites", ...g];
  }, [currentPlaylist?.channels]);

  const filteredChannels = useMemo(() => {
    if (!currentPlaylist) return [];
    let list = currentPlaylist.channels;
    if (activeGroup !== "All" && activeGroup !== "Favorites")
      list = list.filter((c) => c.group === activeGroup);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [currentPlaylist, activeGroup, debouncedSearch]);

  const visibleChannels = useMemo(() => {
    if (activeGroup !== "Favorites") return filteredChannels;
    return filteredChannels.filter((c) => favorites.has(c.id));
  }, [filteredChannels, activeGroup, favorites]);

  const toggleFav  = useCallback((id) => {
    setFavorites((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const handlePlay = useCallback((ch) => setPlaying(ch), []);

  const handleAddPlaylist = async () => {
    if (!addUrl.trim()) return;
    setAddLoading(true); setAddError(null);
    try {
      const channels = await fetchM3U(addUrl.trim());
      if (!channels.length) throw new Error("No channels found in playlist");
      const id = Date.now().toString();
      setPlaylists((prev) => [...prev, { id, name: addName.trim() || "Playlist", url: addUrl.trim(), channels }]);
      setActivePlaylist(id); setShowAdd(false); setAddName(""); setAddUrl("");
    } catch (e) { setAddError(e.message || "Failed to load playlist"); }
    finally { setAddLoading(false); }
  };

  const handleRemovePlaylist = useCallback((id) => {
    if (id === DEFAULT_PLAYLIST.id) return;
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    setActivePlaylist((cur) => cur === id ? (playlists.find((p) => p.id !== id)?.id || null) : cur);
  }, [playlists]);

  const handleRefreshPlaylist = useCallback(async (pl) => {
    if (pl.id === DEFAULT_PLAYLIST.id) { setBuiltinLoading(true); setBuiltinError(null); }
    try {
      const channels = await fetchM3U(pl.url);
      setPlaylists((prev) => prev.map((p) => p.id === pl.id ? { ...p, channels } : p));
    } catch (e) { if (pl.id === DEFAULT_PLAYLIST.id) setBuiltinError(e.message || "Failed to refresh"); }
    finally { if (pl.id === DEFAULT_PLAYLIST.id) setBuiltinLoading(false); }
  }, []);

  const isBuiltinActive = activePlaylist === DEFAULT_PLAYLIST.id;
  const totalCount = currentPlaylist?.channels.length ?? 0;

  // ── Player ─────────────────────────────────────────────────────────────────
  if (playing) {
    return (
      <IPTVPlayer channel={playing} onClose={() => setPlaying(null)} />
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="fade-in iptv-page">
        {/* ── Add modal ── */}
        {showAdd && (
          <div className="iptv-modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="iptv-modal" onClick={(e) => e.stopPropagation()}>
              <div className="iptv-modal-header">
                <div className="iptv-modal-title">Add M3U Playlist</div>
                <button className="iptv-modal-close" onClick={() => setShowAdd(false)}>✕</button>
              </div>
              <div className="iptv-modal-body">
                <label className="iptv-label">Name <span className="iptv-label-opt">(optional)</span></label>
                <input className="iptv-input" placeholder="My Playlist" value={addName} onChange={(e) => setAddName(e.target.value)} />
                <label className="iptv-label">M3U URL</label>
                <input className="iptv-input" placeholder="https://example.com/playlist.m3u" value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddPlaylist()} autoFocus />
                {addError && <div className="iptv-modal-error">⚠ {addError}</div>}
              </div>
              <div className="iptv-modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddPlaylist} disabled={addLoading || !addUrl.trim()}>
                  {addLoading ? <><LoaderIcon size={14} /> Loading…</> : "Add Playlist"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!currentPlaylist ? (
          <div className="iptv-empty">
            <div className="iptv-empty-icon">📡</div>
            <div className="iptv-empty-title">No playlists yet</div>
            <div className="iptv-empty-sub">Add an M3U playlist URL to start watching live TV</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Playlist</button>
          </div>
        ) : (
          <div className="iptv-layout">

            {/* ── Groups sidebar ── */}
            <div className="iptv-groups">
              <div className="iptv-groups-inner">
                {groups.map((g) => (
                  <button
                    key={g}
                    className={`iptv-group-btn${activeGroup === g ? " active" : ""}`}
                    onClick={() => { setActiveGroup(g); setSearch(""); }}
                    title={g}
                  >
                    {g === "Favorites" && <span style={{ marginRight: 6, color: "#f5c518" }}>★</span>}
                    <span className="iptv-group-label">{g}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Channel panel ── */}
            <div className="iptv-panel">
              {/* Search bar */}
              <div className="iptv-search-wrap">
                <svg className="iptv-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  ref={searchRef}
                  className="iptv-search"
                  placeholder="Search channels…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="iptv-search-clear" onClick={() => setSearch("")}>✕</button>
                )}
              </div>

              {/* Result count */}
              {!builtinLoading && visibleChannels.length > 0 && (
                <div className="iptv-result-count">
                  {visibleChannels.length.toLocaleString()} {search ? "results" : activeGroup === "All" ? "channels" : "in " + activeGroup}
                </div>
              )}

              {/* Channel list */}
              {builtinLoading && isBuiltinActive ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 16px" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 16px", height: 64, borderBottom: "1px solid rgba(255,255,255,0.035)" }}>
                      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: "70%", height: 16, borderRadius: 4, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : builtinError && isBuiltinActive ? (
                <div className="iptv-status-msg">
                  <span style={{ fontSize: 28 }}>⚠️</span>
                  <span style={{ color: "var(--text2)" }}>Failed to load channels</span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>{builtinError}</span>
                  <button className="btn btn-ghost" onClick={() => handleRefreshPlaylist(currentPlaylist)}>Retry</button>
                </div>
              ) : visibleChannels.length === 0 ? (
                <div className="iptv-status-msg">
                  <span style={{ fontSize: 28 }}>🔍</span>
                  <span style={{ color: "var(--text2)" }}>No channels found</span>
                  {search && <button className="btn btn-ghost" onClick={() => setSearch("")}>Clear search</button>}
                </div>
              ) : (
                <VirtualChannelList
                  channels={visibleChannels}
                  favorites={favorites}
                  onPlay={handlePlay}
                  onToggleFav={toggleFav}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── ChannelCard ───────────────────────────────────────────────────────────────
const ChannelCard = memo(function ChannelCard({ channel, isFav, onPlay, onToggleFav }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div className="iptv-channel-card" onClick={() => onPlay(channel)}>
      <div className="iptv-channel-logo">
        {channel.logo && !imgFailed
          ? <img src={channel.logo} alt="" loading="lazy" onError={() => setImgFailed(true)} />
          : <span className="iptv-channel-logo-placeholder">📺</span>
        }
      </div>
      <div className="iptv-channel-info">
        <div className="iptv-channel-name">{channel.name}</div>
        <div className="iptv-channel-group">{channel.group}</div>
      </div>
      <div className="iptv-channel-actions">
        <button
          className={`iptv-fav-btn${isFav ? " active" : ""}`}
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => { e.stopPropagation(); onToggleFav(channel.id); }}
        >{isFav ? "★" : "☆"}</button>
        <button className="iptv-play-btn" onClick={(e) => { e.stopPropagation(); onPlay(channel); }}>
          <PlayIcon />
          <span>Watch</span>
        </button>
      </div>
    </div>
  );
});

// ── IPTVPlayer — reuses CustomPlayer (videojs/react + HLS) ──────────────────
function IPTVPlayer({ channel, onClose }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-player-fullscreen", "1");
    return () => document.documentElement.removeAttribute("data-player-fullscreen");
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="iptv-player-wrap player-wrap--fullscreen">
      <div className="player-fs-bar">
        <div className="player-fs-bar__drag" />
        <div className="player-fs-bar__controls">
          <div className="iptv-player-meta">
            <span className="iptv-live-dot" />
            <span className="iptv-player-title">{channel.name}</span>
            {channel.group && <span className="iptv-player-group">{channel.group}</span>}
          </div>
          <button className="player-fs-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>
      </div>
      <CustomPlayer src={channel.url} subtitles={[]} startAt={0} />
    </div>
  );
}
