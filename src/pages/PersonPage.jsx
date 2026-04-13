import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from "react";
import { tmdbFetch, imgUrl } from "../utils/api";
import MediaCard from "../components/MediaCard";
import { StarIcon, ArrowUpIcon } from "../components/Icons";

const BIO_LIMIT = 400;

// Pure utility — hoisted so it is not re-created on every render
const getYear = (date) => date?.slice(0, 4);

function PersonPage({ personId, apiKey, onBack, onSelect }) {
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState(null);
  const [movieCredits, setMovieCredits] = useState({});
  const [tvCredits, setTvCredits] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [scrollState, setScrollState] = useState({ movies: "both", tv: "both", movieCrew: "both", tvCrew: "both" });

  const moviesRef = useRef(null);
  const tvRef = useRef(null);
  const movieCrewRef = useRef(null);
  const tvCrewRef = useRef(null);

  const checkScroll = useCallback((ref, key) => {
    if (!ref.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    const atStart = scrollLeft <= 10;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 10;
    setScrollState((prev) => ({
      ...prev,
      [key]: atStart && atEnd ? "both" : atEnd ? "start" : atStart ? "end" : "both",
    }));
  }, []);

  useEffect(() => {
    const mainEl = document.querySelector(".main");
    if (!mainEl) return;
    const handleScroll = () => setShowScrollTop(mainEl.scrollTop > 1000);
    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const mainEl = document.querySelector(".main");
    if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!apiKey || !personId) return;
    setLoading(true);
    setPerson(null);
    setMovieCredits({});
    setTvCredits({});
    setShowFullBio(false);

    const controller = new AbortController();
    Promise.all([
      tmdbFetch(`/person/${personId}`, apiKey, { signal: controller.signal }),
      tmdbFetch(`/person/${personId}/movie_credits`, apiKey, { signal: controller.signal }),
      tmdbFetch(`/person/${personId}/tv_credits`, apiKey, { signal: controller.signal }),
    ])
      .then(([personData, movieData, tvData]) => {
        setPerson(personData);
        setMovieCredits(movieData);
        setTvCredits(tvData);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.warn("Failed to fetch person", e);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [apiKey, personId]);

  const movieCast = useMemo(() =>
    (movieCredits.cast || [])
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 20).map((i) => ({ ...i, media_type: "movie" })),
    [movieCredits]);
  const movieCrew = useMemo(() =>
    (movieCredits.crew || [])
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10).map((i) => ({ ...i, media_type: "movie" })),
    [movieCredits]);
  const tvCast = useMemo(() =>
    (tvCredits.cast || [])
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 20).map((i) => ({ ...i, media_type: "tv" })),
    [tvCredits]);
  const tvCrew = useMemo(() =>
    (tvCredits.crew || [])
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10).map((i) => ({ ...i, media_type: "tv" })),
    [tvCredits]);

  const birthday = person?.birthday ? new Date(person.birthday + "T12:00:00") : null;
  const deathday = person?.deathday ? new Date(person.deathday + "T12:00:00") : null;
  const age = birthday && !deathday
    ? Math.floor((Date.now() - birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const deathAge = birthday && deathday
    ? Math.floor((deathday.getTime() - birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  if (loading) {
    return (
      <div className="fade-in">
        {/* ── Detail-hero skeleton — mirrors person hero layout ── */}
        <div className="detail-hero">
          <div className="detail-content">
            <div className="skeleton detail-poster" />
            <div className="detail-info">
              <div className="skeleton" style={{ width: 50,   height: 11, borderRadius: 4, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "58%", height: 46, borderRadius: 8, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: 110,  height: 26, borderRadius: 20, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: 220,  height: 16, borderRadius: 4, marginBottom: 14 }} />
              <div className="skeleton" style={{ width: "92%", height: 13, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "84%", height: 13, borderRadius: 4, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "70%", height: 13, borderRadius: 4 }} />
            </div>
          </div>
        </div>
        {/* ── Credit row skeletons — one per credit section ── */}
        {[0, 1, 2].map((ri) => (
          <div key={ri} className="section">
            <div className="section-title">
              <div className="skeleton" style={{ width: 200, height: 22, borderRadius: 6 }} />
            </div>
            <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
              {Array.from({ length: 7 }).map((_, ci) => (
                <div key={ci} style={{ width: 130, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
                  <div style={{ padding: "6px 8px" }}>
                    <div className="skeleton" style={{ height: 12, width: "80%", borderRadius: 4, marginBottom: 4 }} />
                    <div className="skeleton" style={{ height: 10, width: "52%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!person) return null;

  const popularityScore = person.popularity
    ? Math.min(person.popularity / 10, 10).toFixed(1)
    : null;

  return (
    <div className="fade-in">
      <div className="detail-hero">
        <div
          className="detail-bg"
          style={{ backgroundImage: person.profile_path ? `url(${imgUrl(person.profile_path, "w1280")})` : "none" }}
        />
        <div className="detail-gradient" />
        <div className="detail-content">
          <div className="detail-poster">
            {person.profile_path ? (
              <img src={imgUrl(person.profile_path, "h632")} alt={person.name} loading="lazy" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface3)", color: "var(--text3)" }}>
                <StarIcon size={48} />
              </div>
            )}
          </div>
          <div className="detail-info">
            <div className="detail-type">Person</div>
            <div className="detail-title">{person.name}</div>

            {person.known_for_department && (
              <div className="genres">
                <span className="genre-tag">{person.known_for_department}</span>
              </div>
            )}

            <div className="detail-meta">
              {popularityScore && (
                <span className="detail-rating">
                  <StarIcon size={14} /> {popularityScore}
                </span>
              )}
              {birthday && (
                <span>
                  {getYear(person.birthday)}
                  {person.deathday ? ` – ${getYear(person.deathday)}` : ""}
                  {age ? ` (age ${age})` : ""}
                  {deathAge ? ` (died age ${deathAge})` : ""}
                </span>
              )}
              {person.place_of_birth && <span>{person.place_of_birth}</span>}
            </div>

            {person.biography && (
              <>
                <p className="detail-overview">
                  {showFullBio || person.biography.length <= BIO_LIMIT
                    ? person.biography
                    : `${person.biography.slice(0, BIO_LIMIT).trimEnd()}…`}
                </p>
                {person.biography.length > BIO_LIMIT && (
                  <span className="more-link" onClick={() => setShowFullBio((v) => !v)}>
                    {showFullBio ? "Show Less" : "Read More"}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {movieCast.length > 0 && (
        <div className="section">
          <div className="section-title">Movie Credits</div>
          <div
            className={`scroll-row ${scrollState.movies}`}
            ref={moviesRef}
            onScroll={() => checkScroll(moviesRef, "movies")}
          >
            {movieCast.map((item) => (
              <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
            ))}
          </div>
        </div>
      )}

      {tvCast.length > 0 && (
        <div className="section">
          <div className="section-title">TV Credits</div>
          <div
            className={`scroll-row ${scrollState.tv}`}
            ref={tvRef}
            onScroll={() => checkScroll(tvRef, "tv")}
          >
            {tvCast.map((item) => (
              <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
            ))}
          </div>
        </div>
      )}

      {movieCrew.length > 0 && (
        <div className="section">
          <div className="section-title">Crew (Movies)</div>
          <div
            className={`scroll-row ${scrollState.movieCrew}`}
            ref={movieCrewRef}
            onScroll={() => checkScroll(movieCrewRef, "movieCrew")}
          >
            {movieCrew.map((item) => (
              <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
            ))}
          </div>
        </div>
      )}

      {tvCrew.length > 0 && (
        <div className="section">
          <div className="section-title">Crew (TV)</div>
          <div
            className={`scroll-row ${scrollState.tvCrew}`}
            ref={tvCrewRef}
            onScroll={() => checkScroll(tvCrewRef, "tvCrew")}
          >
            {tvCrew.map((item) => (
              <MediaCard key={item.id} item={item} onClick={() => onSelect(item)} />
            ))}
          </div>
        </div>
      )}

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

export default memo(PersonPage);