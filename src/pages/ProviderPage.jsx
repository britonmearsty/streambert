import { useState, useEffect, useRef, useMemo, memo } from "react";
import MediaCard from "../components/MediaCard";
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from "../components/Icons";
import { imgUrl, fetchProviderContent } from "../utils/api";
import { useRatings } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";
import { storage, STORAGE_KEYS } from "../utils/storage";

const MediaRow = memo(function MediaRow({ title, items, onSelect, progress = {}, watched, onMarkWatched, onMarkUnwatched, ratingsMap = {}, ageLimitSetting }) {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  if (!items || items.length === 0) return null;
  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">{title}</div>
        <div className="section-nav">
          <button className="section-nav-btn" onClick={() => scroll(-1)}><ChevronLeftIcon size={16} /></button>
          <button className="section-nav-btn" onClick={() => scroll(1)}><ChevronRightIcon size={16} /></button>
        </div>
      </div>
      <div className="cards-row" ref={rowRef}>
        {items.map((item) => {
          const type = item.media_type === "tv" ? "tv" : "movie";
          const rk = `${type}_${item.id}`;
          const r = ratingsMap[rk] || {};
          const pk = type === "movie" ? `movie_${item.id}` : `tv_${item.id}_s${item.season}e${item.episode}`;
          
          const watchedKey = type === "tv"
            ? item.season != null && item.episode != null
              ? `tv_${item.id}_s${item.season}e${item.episode}`
              : `tv_${item.id}`
            : `movie_${item.id}`;

          return (
            <MediaCard
              key={rk}
              item={item}
              onClick={() => onSelect(item)}
              progress={progress[pk] || 0}
              isWatched={!!watched?.[watchedKey]}
              onMarkWatched={onMarkWatched}
              onMarkUnwatched={onMarkUnwatched}
              ageRating={r.cert}
              restricted={isRestricted(r.minAge, ageLimitSetting)}
            />
          );
        })}
      </div>
    </div>
  );
});

export default function ProviderPage({
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
  const [rows, setRows] = useState([]);
  const [hero, setHero] = useState(null);

  const region = useMemo(() => storage.get(STORAGE_KEYS.WATCH_REGION) || "US", []);

  useEffect(() => {
    if (!apiKey || !provider) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const sections = [
          { title: "Popular Movies", type: "movie", params: {} },
          { title: "Popular Series", type: "tv", params: {} },
          { title: "Action", type: "movie", params: { with_genres: "28" } },
          { title: "Comedy", type: "movie", params: { with_genres: "35" } },
          { title: "Documentaries", type: "movie", params: { with_genres: "99" } },
          { title: "Animation", type: "movie", params: { with_genres: "16" } },
        ];

        const results = await Promise.all(
          sections.map(async (s) => {
            const data = await fetchProviderContent(apiKey, provider.id, s.type, region, s.params);
            return {
              title: s.title,
              items: (data.results || []).map((item) => ({ ...item, media_type: s.type })),
            };
          })
        );

        setRows(results.filter((r) => r.items.length > 0));
        
        // Find a good hero backdrop from popular movies
        const firstMovieRow = results.find(r => r.items.length > 0 && r.items[0].media_type === "movie");
        if (firstMovieRow) {
          setHero(firstMovieRow.items[0]);
        }
      } catch (e) {
        console.error("Failed to fetch provider content", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiKey, provider, region]);

  const allItems = useMemo(() => rows.flatMap((r) => r.items), [rows]);
  const { ratingsMap, ageLimitSetting } = useRatings(allItems);

  if (loading) {
    return (
      <div className="fade-in">
        {/* Hero Skeleton */}
        <div className="hero skeleton" style={{ animation: "none", background: "var(--surface1)" }}>
          <div className="hero-content">
            <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "60%", height: 48, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 150, height: 16, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: "80%", height: 14, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "70%", height: 14, marginBottom: 24 }} />
          </div>
        </div>

        {/* Rows Skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="section" style={{ padding: "0 24px", marginTop: 40 }}>
            <div className="skeleton" style={{ width: 200, height: 24, marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div key={j} className="skeleton" style={{ minWidth: 190, height: 285, borderRadius: 10 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="fade-in">
      <div style={{ paddingTop: 24 }}>
        {rows.length === 0 && !loading && (
          <div className="no-results">No content found for this provider.</div>
        )}
      </div>

      {!loading && hero && (
        <div className="hero" style={{ height: "60vh" }}>
          <div className="hero-bg" style={{ backgroundImage: `url(${imgUrl(hero.backdrop_path, "original")})` }} />
          <div className="hero-gradient" />
          <div className="hero-content">
            <div className="hero-type">Featured on {provider.name}</div>
            <div className="hero-title">{hero.title || hero.name}</div>
            <div className="hero-overview" style={{ maxWidth: 600 }}>{hero.overview}</div>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => onSelect(hero)}>Watch Now</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ paddingBottom: 60 }}>
        {rows.map((row, idx) => (
          <MediaRow
            key={idx}
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
