import { useState, useEffect, useMemo, useCallback } from "react";
import MediaCard from "../components/MediaCard";
import HorizontalRow from "../components/HorizontalRow";
import { PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch, fetchProviderContent } from "../utils/api";
import { useRatings } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { storage } from "../utils/storage";
import { loadHomeLayout } from "../utils/homeLayout";
import { getProviderRows } from "../utils/providers";

// Pure helper — picks a recent history item for the "Similar to" row.
// Deterministic: takes the most-recent qualifying entry to avoid
// picking a different item on every re-render.
function getRecentHistoryItem(history) {
  if (!history || history.length === 0) return null;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return history.find((h) => h.watchedAt && h.watchedAt > sevenDaysAgo) ?? null;
}

export default function HomePage({
  trending,
  trendingTV,
  loading,
  onSelect,
  progress,
  inProgress,
  offline,
  onRetry,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  history,
  apiKey,
  favoriteProviders = [],
  onNavigate,
}) {
  const hero = trending[0];

  const [similarItems, setSimilarItems] = useState([]);
  const [similarSource, setSimilarSource] = useState(null);
  const [topRatedItems, setTopRatedItems] = useState([]);
  const [providerContent, setProviderContent] = useState({});

  // Load layout config (order + visibility) once on mount
  const [layout] = useState(() => loadHomeLayout(getProviderRows()));
  const { order: rowOrder, visible: rowVisible } = layout;

  // Fetch trending content for each favourite provider
  useEffect(() => {
    if (!apiKey || offline || favoriteProviders.length === 0) return;
    const region = storage.get("watchRegion") || "US";
    const controller = new AbortController();
    Promise.allSettled(
      favoriteProviders.map((p) =>
        fetchProviderContent(apiKey, p.id, "movie", region)
          .then((data) => ({
            key: `provider_${p.id}`,
            items: (data.results || []).slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
          }))
      )
    ).then((results) => {
      if (controller.signal.aborted) return;
      const content = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) content[r.value.key] = r.value.items;
      });
      setProviderContent(content);
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline, favoriteProviders.length]);

  // All items for batch ratings fetch
  const allItems = useMemo(
    () => [
      ...inProgress,
      ...trending.map((i) => ({ ...i, media_type: "movie" })),
      ...trendingTV.map((i) => ({ ...i, media_type: "tv" })),
      ...similarItems,
      ...topRatedItems,
      ...Object.values(providerContent).flat(),
    ],
    [inProgress, trending, trendingTV, similarItems, topRatedItems, providerContent],
  );

  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  // Fetch similar items based on recent watch history
  useEffect(() => {
    if (!apiKey || offline || !history || history.length === 0) return;
    const source = getRecentHistoryItem(history);
    if (!source) return;
    setSimilarSource(source);
    const type = source.media_type === "tv" ? "tv" : "movie";
    const tryFetch = (endpoint) =>
      tmdbFetch(`/${type}/${source.id}/${endpoint}`, apiKey).then((data) =>
        (data.results || [])
          .slice(0, 10)
          .map((item) => ({ ...item, media_type: type })),
      );
    tryFetch("similar")
      .then((results) => {
        if (results.length > 0) {
          setSimilarItems(results);
          return;
        }
        return tryFetch("recommendations").then(setSimilarItems);
      })
      .catch(() =>
        tryFetch("recommendations")
          .then(setSimilarItems)
          .catch(() => {}),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline, history?.length]);

  // Fetch top rated movies + TV, merge and shuffle
  useEffect(() => {
    if (!apiKey || offline) return;
    const controller = new AbortController();
    Promise.all([
      tmdbFetch("/movie/top_rated?page=1", apiKey, {
        signal: controller.signal,
      }),
      tmdbFetch("/tv/top_rated?page=1", apiKey, { signal: controller.signal }),
    ])
      .then(([moviesData, tvData]) => {
        const movies = (moviesData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "movie" }));
        const tv = (tvData.results || [])
          .slice(0, 8)
          .map((i) => ({ ...i, media_type: "tv" }));
        // Interleave movies and TV for variety
        const merged = [];
        const max = Math.max(movies.length, tv.length);
        for (let i = 0; i < max; i++) {
          if (movies[i]) merged.push(movies[i]);
          if (tv[i]) merged.push(tv[i]);
        }
        setTopRatedItems(merged);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.warn("Top rated fetch failed", e);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, offline]);

  // Stable pre-built item arrays for carousels, capped at 10
  const trendingMovieItems = useMemo(
    () => trending.slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
    [trending],
  );
  const trendingTVItems = useMemo(
    () => trendingTV.slice(0, 10).map((i) => ({ ...i, media_type: "tv" })),
    [trendingTV],
  );

  // Stable handler — hero changes only when trending refreshes (~30 min TTL)
  const handleHeroSelect = useCallback(() => {
    if (hero) onSelect(hero);
  }, [hero, onSelect]);

  return (
    <div className="fade-in">
      {/* ── Offline ── */}
      {offline && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 16,
            color: "var(--text2)",
          }}
        >
          <div style={{ fontSize: 48 }}>📡</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
            No internet connection
          </div>
          <div style={{ fontSize: 14, color: "var(--text3)" }}>
            Trending and search require an internet connection. Your downloads
            and library still work offline.
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {!offline && loading && (
        <>
          {/* ── Hero skeleton ── */}
          <div className="hero" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 48 }}>
            <div className="skeleton" style={{ width: 80,   height: 11, borderRadius: 4, marginBottom: 14 }} />
            <div className="skeleton" style={{ width: "52%", height: 52, borderRadius: 8, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 160,  height: 16, borderRadius: 4, marginBottom: 8  }} />
            <div className="skeleton" style={{ width: "72%", height: 13, borderRadius: 4, marginBottom: 6  }} />
            <div className="skeleton" style={{ width: "60%", height: 13, borderRadius: 4, marginBottom: 28 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <div className="skeleton" style={{ width: 130, height: 44, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 110, height: 44, borderRadius: 8 }} />
            </div>
          </div>
          {/* ── Row skeletons — mirror the HorizontalRow layout ── */}
          {[0, 1, 2].map((ri) => (
            <div key={ri} className="section">
              <div className="section-title">
                <div className="skeleton" style={{ width: 220, height: 22, borderRadius: 6 }} />
              </div>
              <div className="horizontal-scroll">
                {Array.from({ length: 7 }).map((_, ci) => (
                  <div key={ci} className="horizontal-scroll-item" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                    <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
                    <div style={{ padding: "8px 10px" }}>
                      <div className="skeleton" style={{ height: 13, width: "78%", borderRadius: 4, marginBottom: 5 }} />
                      <div className="skeleton" style={{ height: 11, width: "50%", borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Hero (always first) ── */}
      {!loading && hero && (
        <div className="hero">
          <div
            className="hero-bg"
            style={{
              backgroundImage: `url(${imgUrl(hero.backdrop_path, "original")})`,
            }}
          />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-type">Trending · Movie</div>
            <div className="hero-title">{hero.title || hero.name}</div>
            <div className="hero-meta">
              <span className="hero-rating">
                <StarIcon /> {hero.vote_average?.toFixed(1)}
              </span>
              <span>{hero.release_date?.slice(0, 4)}</span>
            </div>
            <div className="hero-overview">{hero.overview}</div>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={handleHeroSelect}>
                <PlayIcon /> Watch Now
              </button>
              <button className="btn btn-secondary" onClick={handleHeroSelect}>
                More Info
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rows in user-configured order ── */}
      {rowOrder.map((id) => {
        if (!rowVisible[id]) return null;

        if (id === "continue") {
          if (inProgress.length === 0) return null;
          return (
            <div key="continue" className="section">
              <div className="section-title">Continue Watching</div>
              <div className="cards-grid">
                {inProgress.map((item) => {
                  const typeKey = item.media_type === "movie" ? "movie" : "tv";
                  const pk =
                    typeKey === "movie"
                      ? `movie_${item.id}`
                      : `tv_${item.id}_s${item.season}e${item.episode}`;
                  const ratingKey = `${typeKey}_${item.id}`;
                  const r = ratingsMap[ratingKey] || { cert: null, minAge: null };
                  const restricted = isRestricted(r.minAge, ageLimitSetting);
                  return (
                    <MediaCard
                      key={`${typeKey}_${item.id}`}
                      item={item}
                      onClick={() => onSelect(item)}
                      progress={progress[pk] || 0}
                      watched={watched}
                      onMarkWatched={onMarkWatched}
                      onMarkUnwatched={onMarkUnwatched}
                      ageRating={r.cert}
                      restricted={restricted}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        if (id === "similar") {
          if (!similarSource || similarItems.length === 0) return null;
          return (
            <HorizontalRow
              key="similar"
              items={similarItems}
              title="Similar to"
              titleHighlight={similarSource.title || similarSource.name}
              onSelect={onSelect}
              progress={progress}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
            />
          );
        }

        if (id === "trendingMovies") {
          if (trendingMovieItems.length === 0) return null;
          return (
            <HorizontalRow
              key="trendingMovies"
              items={trendingMovieItems}
              title="Trending Movies"
              onSelect={onSelect}
              progress={progress}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
            />
          );
        }

        if (id === "trendingTV") {
          if (trendingTVItems.length === 0) return null;
          return (
            <HorizontalRow
              key="trendingTV"
              items={trendingTVItems}
              title="Trending Series"
              onSelect={onSelect}
              progress={progress}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
            />
          );
        }

        if (id === "topRated") {
          if (topRatedItems.length === 0) return null;
          return (
            <HorizontalRow
              key="topRated"
              items={topRatedItems}
              title="Top Rated"
              onSelect={onSelect}
              progress={progress}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
            />
          );
        }

        if (id.startsWith("provider_")) {
          const providerId = Number(id.replace("provider_", ""));
          const provider = favoriteProviders.find((p) => p.id === providerId);
          const items = providerContent[id];
          if (!provider || !items || items.length === 0) return null;
          return (
            <HorizontalRow
              key={id}
              items={items}
              title="Trending on"
              titleHighlight={provider.name}
              onSelect={onSelect}
              progress={progress}
              watched={watched}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ratingsMap={ratingsMap}
              ageLimitSetting={ageLimitSetting}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
