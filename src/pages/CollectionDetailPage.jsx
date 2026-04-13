import { useState, useEffect, useCallback, memo } from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import { FilmIcon, ArrowUpIcon } from "../components/Icons";
import MediaCard from "../components/MediaCard";

function CollectionDetailPage({ collection, apiKey, onSelect, onBack }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isTmdb = collection?.source === "tmdb";

  const scrollToTop = useCallback(
    () => document.querySelector(".main")?.scrollTo({ top: 0, behavior: "smooth" }),
    [],
  );

  useEffect(() => {
    const mainEl = document.querySelector(".main");
    if (!mainEl) return;
    const handleScroll = () => setShowScrollTop(mainEl.scrollTop > 400);
    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isTmdb || !apiKey || !collection?.id) return;
    setLoading(true);
    setDetails(null);
    tmdbFetch(`/collection/${collection.id}`, apiKey)
      .then((data) => setDetails(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [collection?.id, apiKey, isTmdb]);

  if (!collection) return null;

  // ── TMDB collection ──────────────────────────────────────────────────────
  if (isTmdb) {
    const name = details?.name || collection.name;
    const overview = details?.overview || collection.overview;
    const poster = details?.poster_path || collection.poster_path;
    const backdrop = details?.backdrop_path || collection.backdrop_path;
    const parts = (details?.parts || [])
      .map((p) => ({ ...p, media_type: "movie" }))
      .sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));

    return (
      <div className="fade-in">
        <div className="detail-hero">
          <div className="detail-bg" style={{ backgroundImage: backdrop ? `url(${imgUrl(backdrop, "w1280")})` : "none" }} />
          <div className="detail-gradient" />
          <div className="detail-content">
            <div className="detail-poster">
              {poster ? (
                <img src={imgUrl(poster)} alt={name} loading="lazy" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface3)", color: "var(--text3)" }}>
                  <FilmIcon />
                </div>
              )}
            </div>
            <div className="detail-info">
              <div className="detail-type">Collection</div>
              <div className="detail-title">{name}</div>
              {!loading && parts.length > 0 && (
                <div className="detail-meta">
                  <span>{parts.length} {parts.length === 1 ? "film" : "films"}</span>
                </div>
              )}
              {overview && <p className="detail-overview">{overview}</p>}
            </div>
          </div>
        </div>

        <div style={{ padding: "32px 32px 60px" }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "24px 16px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div className="skeleton" style={{ height: 13, width: "75%", borderRadius: 4, marginBottom: 5 }} />
                    <div className="skeleton" style={{ height: 11, width: "48%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : parts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "24px 16px" }}>
              {parts.map((item) => (
                <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
              ))}
            </div>
          ) : null}
        </div>

        <button
          className={`fab ${showScrollTop ? "fab--visible" : ""}`}
          onClick={scrollToTop}
          title="Scroll to Top"
        >
          <ArrowUpIcon size={24} />
        </button>
      </div>
    );
  }

  // ── User collection ──────────────────────────────────────────────────────
  const mediaList = collection.media || [];
  return (
    <div className="fade-in" style={{ padding: "24px 32px" }}>
      <div style={{ marginBottom: 32, borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "var(--red)", marginBottom: 4 }}>
          Collection
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>{collection.title}</h1>
      </div>
      {mediaList.length === 0 ? (
        <div style={{ padding: 40, color: "var(--text3)", textAlign: "center" }}>
          <FilmIcon />
          <p style={{ marginTop: 16 }}>This collection is empty</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: "24px 16px" }}>
          {mediaList.map((item) => (
            <MediaCard key={`${item.media_type}_${item.id}`} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(CollectionDetailPage);
