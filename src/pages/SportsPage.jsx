import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { IconWeStream, ChevronLeftIcon, ChevronRightIcon, StarIcon, SourceIcon, LoaderIcon } from "../components/Icons";
import "../styles/global.css"; // Reuse global styles

const STREAMED_BASE = "https://streamed.pk";

// ── In-memory sports cache (session-scoped) ────────────────────────────────────
const _sportsCache = new Map(); // key → { data, expiresAt, ts }
const SPORTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for categories
const MATCHES_CACHE_TTL = 3 * 60 * 1000; // 3 minutes for matches
const _maxCacheEntries = 20;

function _getCached(key) {
  const cached = _sportsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  return null;
}

function _setCached(key, data, ttl = SPORTS_CACHE_TTL) {
  _sportsCache.set(key, { data, expiresAt: Date.now() + ttl, ts: Date.now() });
  if (_sportsCache.size > _maxCacheEntries) {
    const now = Date.now();
    for (const [k, v] of _sportsCache) {
      if (now >= v.expiresAt) _sportsCache.delete(k);
    }
  }
}

function _isStale(key, ttl = SPORTS_CACHE_TTL) {
  const cached = _sportsCache.get(key);
  if (!cached) return true;
  // Consider cache stale if older than 1.5x the given TTL
  const staleThreshold = cached.ts + (ttl * 1.5);
  return Date.now() > staleThreshold;
}

export default function SportsPage({ onBack }) {
  const [sports, setSports] = useState([]);
  const [activeSport, setActiveSport] = useState("all");
  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [popularMatches, setPopularMatches] = useState([]);
  const [todayMatches, setTodayMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(null); // { embedUrl, title, streamNo }
  const [streams, setStreams] = useState([]);
  const [loadingStreams, setLoadingStreams] = useState(false);

  // Fetch sports categories (with stale-while-revalidate)
  useEffect(() => {
    if (!window.electron?.sportsGetSports) return;
    
    const cacheKey = "initial";
    const cached = _getCached(cacheKey);
    const isStale = cached ? _isStale(cacheKey, SPORTS_CACHE_TTL) : true;
    const hasExisting = cached && cached.sports?.length > 0;
    
    // Show cached data immediately if available and not stale
    if (cached && !isStale) {
      setSports(cached.sports);
      setLiveMatches(cached.liveMatches);
      setPopularMatches(cached.popularMatches);
      setTodayMatches(cached.todayMatches);
      setLoadingInitial(false);
      // Still fetch in background to keep cache fresh
      window.electron.sportsGetSports().then(d => {
        if (!d?.error) _setCached(cacheKey, { 
          sports: [{ id: "all", name: "All Sports" }, ...(d || [])],
          liveMatches: cached.liveMatches,
          popularMatches: cached.popularMatches,
          todayMatches: cached.todayMatches
        }, SPORTS_CACHE_TTL);
      }).catch(() => {});
      return;
    }

    // Show existing data while fetching (stale or no cache)
    if (hasExisting) {
      setSports(cached.sports);
      setLiveMatches(cached.liveMatches);
      setPopularMatches(cached.popularMatches);
      setTodayMatches(cached.todayMatches);
    } else {
      setLoadingInitial(true);
    }

    // Fetch fresh data
    Promise.all([
      window.electron.sportsGetSports(),
      window.electron.sportsGetLiveMatches(),
      window.electron.sportsGetPopularMatches(),
      window.electron.sportsGetTodayMatches(),
    ])
      .then(([sportsData, liveData, popularData, todayData]) => {
        if (sportsData?.error) throw new Error(sportsData.error);
        const sportsArr = [{ id: "all", name: "All Sports" }, ...(sportsData || [])];
        const liveArr = Array.isArray(liveData) ? liveData : [liveData].filter(Boolean);
        const popularArr = Array.isArray(popularData) ? popularData : [popularData].filter(Boolean);
        const todayArr = Array.isArray(todayData) ? todayData : [todayData].filter(Boolean);
        
        setSports(sportsArr);
        setLiveMatches(liveArr);
        setPopularMatches(popularArr);
        setTodayMatches(todayArr);
        
        _setCached(cacheKey, { sports: sportsArr, liveMatches: liveArr, popularMatches: popularArr, todayMatches: todayArr }, SPORTS_CACHE_TTL);
      })
      .catch((err) => console.error("Failed to fetch sports data:", err))
      .finally(() => setLoadingInitial(false));
  }, []);

  // Fetch matches based on active sport (with stale-while-revalidate)
  useEffect(() => {
    if (!window.electron?.sportsGetMatches) return;
    setError(null);

    const cacheKey = `matches_${activeSport}`;
    const cached = _getCached(cacheKey);
    const isStale = cached ? _isStale(cacheKey, MATCHES_CACHE_TTL) : true;
    
    // Show cached data immediately if fresh
    if (cached && !isStale) {
      setMatches(cached);
      setLoading(false);
      return;
    }

    // Show existing data while fetching (stale or no cache)
    if (cached) {
      setMatches(cached);
    } else {
      setLoading(true);
    }

    window.electron.sportsGetMatches(activeSport)
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setMatches(data);
        _setCached(cacheKey, data, MATCHES_CACHE_TTL);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load matches");
        if (!cached) {
          setLoading(false);
        }
      });
  }, [activeSport]);

  // Player fullscreen
  useEffect(() => {
    if (playing) {
      document.documentElement.setAttribute("data-player-fullscreen", "1");
    } else {
      document.documentElement.removeAttribute("data-player-fullscreen");
    }
  }, [playing]);

  useEffect(() => () => {
    document.documentElement.removeAttribute("data-player-fullscreen");
    window.electron?.playerStopped?.();
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { playing ? setPlaying(null) : onBack?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [playing, onBack]);

  const handlePlayMatch = async (match) => {
    if (!match.sources || match.sources.length === 0) return;
    if (!window.electron?.sportsGetStreams) return;
    
    setLoadingStreams(true);
    const source = match.sources[0];
    try {
      const data = await window.electron.sportsGetStreams({ source: source.source, id: source.id });
      if (data.error) throw new Error(data.error);
      setStreams(data);
      if (data.length > 0) {
        const stream = data[0];
        setPlaying({
          embedUrl: stream.embedUrl,
          title: match.title,
          streamNo: stream.streamNo,
        });
      }
    } catch (err) {
      console.error("Failed to fetch streams:", err);
    } finally {
      setLoadingStreams(false);
    }
  };

  const categoriesRef = useRef(null);
  const scrollCategories = (dir) => {
    if (categoriesRef.current) {
      categoriesRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  if (playing) {
    return (
      <SportsPlayer 
        match={playing} 
        streams={streams}
        onClose={() => setPlaying(null)} 
        onSwitchStream={(stream) => setPlaying({ 
          ...playing, 
          embedUrl: stream.embedUrl, 
          streamNo: stream.streamNo,
        })}
      />
    );
  }

  return (
    <div className="fade-in sports-page">
      <div className="sports-header">
        <div className="sports-title-wrap">
          <IconWeStream />
          <h1 className="sports-title">Sports Center</h1>
        </div>
      </div>

      {/* Categories Scroller */}
      <div className="sports-categories-wrap">
        <button className="categories-nav-btn" onClick={() => scrollCategories(-1)} disabled={loadingInitial}>
          <ChevronLeftIcon size={18} />
        </button>
        <div className="sports-categories" ref={categoriesRef}>
          {loadingInitial ? (
            <>
              <div className="sport-cat-skeleton skeleton" />
              <div className="sport-cat-skeleton skeleton" />
              <div className="sport-cat-skeleton skeleton" />
              <div className="sport-cat-skeleton skeleton" />
              <div className="sport-cat-skeleton skeleton" />
            </>
          ) : (
            sports.map((sport) => (
              <button
                key={sport.id}
                className={`sport-cat-btn ${activeSport === sport.id ? "active" : ""}`}
                onClick={() => setActiveSport(sport.id)}
              >
                {sport.name}
              </button>
            ))
          )}
        </div>
        <button className="categories-nav-btn" onClick={() => scrollCategories(1)} disabled={loadingInitial}>
          <ChevronRightIcon size={18} />
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .sport-cat-skeleton {
          width: 80px;
          height: 36px;
          border-radius: 20px;
        }
        .categories-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      ` }} />

      {/* Live Section */}
      {(loadingInitial ? 3 : liveMatches.length > 0) && activeSport === "all" && (
        <div className="sports-section">
          <div className="section-header">
            <div className="section-title">
              <span className="live-dot" /> Live Now
            </div>
          </div>
          <div className="sports-grid">
            {loadingInitial ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              liveMatches.map((match) => (
                <MatchCard key={match.id} match={match} onPlay={() => handlePlayMatch(match)} isLive />
              ))
            )}
          </div>
        </div>
      )}

      {/* Popular Section */}
      {(loadingInitial ? 3 : popularMatches.length > 0) && activeSport === "all" && (
        <div className="sports-section">
          <div className="section-header">
            <div className="section-title">
              <StarIcon /> Popular Events
            </div>
          </div>
          <div className="sports-grid">
            {loadingInitial ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              popularMatches.map((match) => (
                <MatchCard key={match.id} match={match} onPlay={() => handlePlayMatch(match)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Today Section */}
      {(loadingInitial ? 3 : todayMatches.length > 0) && activeSport === "all" && (
        <div className="sports-section">
          <div className="section-header">
            <div className="section-title">
              Today's Schedule
            </div>
          </div>
          <div className="sports-grid">
            {loadingInitial ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              todayMatches.map((match) => (
                <MatchCard key={match.id} match={match} onPlay={() => handlePlayMatch(match)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Matches Section */}
      <div className="sports-section">
        <div className="section-header">
          <div className="section-title">
            {activeSport === "all" ? "Upcoming Matches" : `${sports.find(s => s.id === activeSport)?.name || ""} Matches`}
          </div>
        </div>
        {loading || loadingInitial ? (
          <div className="sports-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="error-msg">
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => setActiveSport(activeSport)}>Retry</button>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-msg">No matches found for this category.</div>
        ) : (
          <div className="sports-grid">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} onPlay={() => handlePlayMatch(match)} />
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sports-page {
          padding: 24px;
          color: var(--text);
        }
        .sports-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 32px;
        }
        .sports-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--red);
        }
        .sports-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: var(--text);
        }
        .sports-categories-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          position: relative;
        }
        .sports-categories {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 4px 0;
          scroll-behavior: smooth;
        }
        .sports-categories::-webkit-scrollbar { display: none; }
        .sport-cat-btn {
          padding: 8px 18px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          color: var(--text2);
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sport-cat-btn:hover {
          background: var(--bg3);
          border-color: var(--text3);
        }
        .sport-cat-btn.active {
          background: var(--red);
          color: white;
          border-color: var(--red);
        }
        .categories-nav-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--text);
          cursor: pointer;
          z-index: 2;
        }
        .sports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .error-msg {
          text-align: center;
          padding: 48px;
          color: var(--text2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .error-msg p {
          margin: 0;
          font-size: 16px;
        }
        .empty-msg {
          text-align: center;
          padding: 48px;
          color: var(--text2);
        }
        .match-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .match-card:hover {
          transform: translateY(-4px);
          border-color: var(--red);
        }
        .match-poster {
          width: 100%;
          height: 120px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 8px;
          background: var(--bg3);
        }
        .match-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .match-card:hover .match-poster img {
          opacity: 1;
        }
        .match-card.live {
          border-color: rgba(255, 71, 71, 0.4);
        }
        .match-category {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text3);
          letter-spacing: 0.5px;
        }
        .match-teams {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .team-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 16px;
          font-weight: 600;
        }
        .team-badge {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }
        .vs-divider {
          font-size: 12px;
          color: var(--text3);
          font-weight: 400;
          margin: 4px 0;
        }
        .match-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .match-date {
          font-size: 13px;
          color: var(--text2);
        }
        .live-badge {
          background: var(--red);
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .live-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background: var(--red);
          border-radius: 50%;
          margin-right: 8px;
          box-shadow: 0 0 8px var(--red);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .sports-player-wrap {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: black;
          z-index: 10000;
        }
        .player-fs-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
          z-index: 100;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .player-fs-bar.hidden {
          transform: translateY(-100%);
          opacity: 0;
        }
        .player-fs-bar.visible {
          transform: translateY(0);
          opacity: 1;
        }
        .player-wrap--fullscreen .player-fs-bar {
          top: 50px;
        }
        .player-fs-bar__drag {
          position: absolute;
          inset: 0;
          -webkit-app-region: drag;
          z-index: -1;
          pointer-events: none;
        }
        .player-fs-bar__controls {
          -webkit-app-region: no-drag;
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
        }
        .player-fs-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .player-fs-close:hover {
          opacity: 1;
        }
        .stream-dropdown {
          min-width: 200px;
          z-index: 10001;
        }
        .stream-item-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .stream-item-name {
          font-size: 14px;
          font-weight: 600;
        }
        .stream-item-lang {
          font-size: 11px;
          color: var(--text3);
          font-weight: 500;
        }
      ` }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="match-card" style={{ pointerEvents: "none" }}>
      <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 8, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "80%", height: 16, borderRadius: 4, marginBottom: 4 }} />
      <div className="skeleton" style={{ width: "60%", height: 16, borderRadius: 4 }} />
    </div>
  );
}

function MatchCard({ match, onPlay, isLive }) {
  const dateStr = new Date(match.date).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getBadgeUrl = (badgeId) => {
    if (!badgeId) return null;
    return `${STREAMED_BASE}/api/images/badge/${badgeId}.webp`;
  };

  const getPosterUrl = (posterPath, teams) => {
    if (posterPath) {
      if (posterPath.startsWith("http")) return posterPath;
      return `${STREAMED_BASE}${posterPath}`;
    }
    // Fallback to match poster API if team badges exist
    if (teams?.home?.badge && teams?.away?.badge) {
      return `${STREAMED_BASE}/api/images/poster/${teams.home.badge}/${teams.away.badge}.webp`;
    }
    return null;
  };

  const posterUrl = getPosterUrl(match.poster, match.teams);

  return (
    <div className={`match-card ${isLive ? 'live' : ''}`} onClick={onPlay}>
      {posterUrl && (
        <div className="match-poster">
          <img src={posterUrl} alt={match.title} loading="lazy" />
        </div>
      )}
      <div className="match-category">{match.category}</div>
      <div className="match-teams">
        {match.teams ? (
          <>
            <div className="team-row">
              {match.teams.home.badge && <img src={getBadgeUrl(match.teams.home.badge)} className="team-badge" alt="" />}
              <span>{match.teams.home.name}</span>
            </div>
            <div className="vs-divider">vs</div>
            <div className="team-row">
              {match.teams.away.badge && <img src={getBadgeUrl(match.teams.away.badge)} className="team-badge" alt="" />}
              <span>{match.teams.away.name}</span>
            </div>
          </>
        ) : (
          <div className="team-row">{match.title}</div>
        )}
      </div>
      <div className="match-footer">
        <div className="match-date">{dateStr}</div>
        {isLive && <div className="live-badge">Live</div>}
      </div>
    </div>
  );
}

function SportsPlayer({ match, streams, onClose, onSwitchStream }) {
  const finalUrl = useMemo(() => {
    try {
      const u = new URL(match.embedUrl);
      u.searchParams.set("autoplay", "1");
      u.searchParams.set("muted", "0");
      u.searchParams.set("mute", "0");
      return u.toString();
    } catch (e) {
      return match.embedUrl;
    }
  }, [match.embedUrl]);

  const [showControls, setShowControls] = useState(true);
  const [showStreamMenu, setShowStreamMenu] = useState(false);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [menuPos, setMenuPos] = useState(null);
  const webviewRef = useRef(null);
  const streamBtnRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowStreamMenu(false);
    }, 3000);
  };

  useEffect(() => {
    handleMouseMove();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showStreamMenu) return;
    const close = () => setShowStreamMenu(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    const handleClick = (e) => {
      if (streamBtnRef.current?.contains(e.target) || e.target.closest(".stream-dropdown")) return;
      close();
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showStreamMenu]);

  useEffect(() => {
    setWebviewLoading(true);
  }, [match.embedUrl]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const done = () => setWebviewLoading(false);
    
    // Safety timeout: hide spinner after 12s even if events don't fire
    const safetyTimer = setTimeout(done, 12000);

    wv.addEventListener("did-finish-load", done);
    wv.addEventListener("did-fail-load", done);
    wv.addEventListener("dom-ready", done);

    return () => {
      clearTimeout(safetyTimer);
      wv.removeEventListener("did-finish-load", done);
      wv.removeEventListener("did-fail-load", done);
      wv.removeEventListener("dom-ready", done);
    };
  }, [match.embedUrl]);

  return (
    <div className="sports-player-wrap player-wrap--fullscreen" onMouseMove={handleMouseMove}>
      <webview
        key={match.embedUrl}
        ref={webviewRef}
        src={finalUrl}
        partition="persist:player"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "black", border: "none", visibility: webviewLoading ? "hidden" : "visible" }}
        allowfullscreen
        autoplay="true"
      />

      {webviewLoading && (
        <div style={{ 
          position: "absolute", 
          inset: 0, 
          zIndex: 10, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          background: "rgba(0,0,0,0.92)", 
          gap: 14, 
          borderRadius: "inherit" 
        }}>
          <LoaderIcon size={40} />
          <span style={{ fontSize: 14, color: "var(--text2)" }}>
            Loading Stream {match.streamNo}...
          </span>
        </div>
      )}

      <div className={`player-fs-bar ${showControls ? "visible" : "hidden"}`}>
        <div className="player-fs-bar__drag" />
        <div className="player-fs-bar__controls">
          <button className="player-fs-close" title="Close player (Esc)" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className={`player-overlay-group ${showControls ? "visible" : "hidden"}`} style={{ opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none", transition: "opacity 0.3s ease" }}>
        {streams.length > 1 && (
          <button
            ref={streamBtnRef}
            className="player-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              const rect = streamBtnRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ top: rect.bottom + 6, left: rect.left });
              setShowStreamMenu((v) => !v);
            }}
            title="Change stream source"
          >
            <SourceIcon />
            Stream {match.streamNo}
          </button>
        )}
      </div>

      {showStreamMenu && menuPos && (
        <div 
          className="source-dropdown source-dropdown--fixed stream-dropdown" 
          style={{ top: menuPos.top, left: menuPos.left }} 
          onClick={(e) => e.stopPropagation()}
        >
          {streams.map((s) => (
            <button
              key={s.streamNo}
              className={"source-dropdown__item" + (match.streamNo === s.streamNo ? " source-dropdown__item--active" : "")}
              onClick={() => {
                setShowStreamMenu(false);
                if (s.streamNo === match.streamNo) return;
                onSwitchStream(s);
              }}
            >
              <div className="stream-item-info">
                <span className="stream-item-name">Stream {s.streamNo}</span>
                <span className="stream-item-lang">{s.language}</span>
              </div>
              {s.hd && <span className="source-dropdown__tag">HD</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
