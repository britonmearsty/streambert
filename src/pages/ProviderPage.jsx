import { useState, useEffect, useMemo, useCallback, memo } from "react";
import HorizontalRow from "../components/HorizontalRow";
import HorizontalScroll from "../components/HorizontalScroll";
import { PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, fetchProviderContent } from "../utils/api";
import { useRatings } from "../utils/useRatings";
import { storage } from "../utils/storage";

const SECTIONS = [
  { title: "Popular Movies",  type: "movie", params: {} },
  { title: "Popular Series",  type: "tv",    params: {} },
  { title: "Action",          type: "movie", params: { with_genres: "28" } },
  { title: "Comedy",          type: "movie", params: { with_genres: "35" } },
  { title: "Drama",           type: "tv",    params: { with_genres: "18" } },
  { title: "Documentaries",   type: "movie", params: { with_genres: "99" } },
  { title: "Animation",       type: "movie", params: { with_genres: "16" } },
];

function ProviderPage({
  provider,
  apiKey,
  onSelect,
  onBack,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows]       = useState([]);
  const [hero, setHero]       = useState(null);

  const region = useMemo(() => storage.get("watchRegion") || "US", []);

  useEffect(() => {
    if (!apiKey || !provider) return;
    setLoading(true);
    setRows([]);
    setHero(null);

    const controller = new AbortController();

    Promise.all(
      SECTIONS.map((s) =>
        fetchProviderContent(apiKey, provider.id, s.type, region, s.params).then((data) => ({
          title: s.title,
          items: (data.results || []).map((item) => ({ ...item, media_type: s.type })),
        }))
      )
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        const filled = results.filter((r) => r.items.length > 0);
        setRows(filled);
        const firstWithBackdrop = filled
          .flatMap((r) => r.items)
          .find((i) => i.backdrop_path);
        if (firstWithBackdrop) setHero(firstWithBackdrop);
      })
      .catch((e) => { if (e.name !== "AbortError") console.error(e); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [apiKey, provider?.id, region]);

  const allItems = useMemo(() => rows.flatMap((r) => r.items), [rows]);
  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  // Stable handlers — hero changes only when a new provider is loaded
  const handleHeroSelect = useCallback(() => { if (hero) onSelect(hero); }, [hero, onSelect]);

  if (!provider) return null;

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="fade-in">
        <div className="hero">
          <div className="hero-bg" style={{ background: "var(--surface1)" }} />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="skeleton" style={{ width: 120, height: 14, marginBottom: 14, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "55%", height: 52, marginBottom: 16, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 180, height: 18, marginBottom: 18, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "75%", height: 14, marginBottom: 8, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 28, borderRadius: 6 }} />
            <div style={{ display: "flex", gap: 12 }}>
              <div className="skeleton" style={{ width: 120, height: 42, borderRadius: 8 }} />
              <div className="skeleton" style={{ width: 100, height: 42, borderRadius: 8 }} />
            </div>
          </div>
        </div>
        {/* Row skeletons — one per section that will load */}
        {[0, 1, 2, 3].map((ri) => (
          <div key={ri} className="section">
            <div className="section-title">
              <div className="skeleton" style={{ width: 200, height: 22, borderRadius: 6 }} />
            </div>
            <HorizontalScroll showButtons={false}>
              {Array.from({ length: 7 }).map((_, ci) => (
                <div key={ci} className="horizontal-scroll-item" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div className="skeleton" style={{ height: 13, width: "78%", borderRadius: 4, marginBottom: 5 }} />
                    <div className="skeleton" style={{ height: 11, width: "50%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </HorizontalScroll>
          </div>
        ))}
      </div>
    );
  }

  /* ── Content ── */
  return (
    <div className="fade-in">
      {/* Hero — same structure as HomePage */}
      {hero && (
        <div className="hero">
          <div
            className="hero-bg"
            style={{ backgroundImage: `url(${imgUrl(hero.backdrop_path, "original")})` }}
          />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-type">Featured on {provider.name}</div>
            <div className="hero-title">{hero.title || hero.name}</div>
            <div className="hero-meta">
              <span className="hero-rating">
                <StarIcon /> {hero.vote_average?.toFixed(1)}
              </span>
              <span>{(hero.release_date || hero.first_air_date)?.slice(0, 4)}</span>
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

      {rows.length === 0 && (
        <div className="no-results">No content available for this provider.</div>
      )}

      <div style={{ paddingBottom: 60 }}>
        {rows.map((row) => (
          <HorizontalRow
            key={row.title}
            title={row.title}
            items={row.items}
            onSelect={onSelect}
            progress={progress}
            watched={watched}
            onMarkWatched={onMarkWatched}
            onMarkUnwatched={onMarkUnwatched}
            ratingsMap={ratingsMap}
            ageLimitSetting={ageLimitSetting}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ProviderPage);
