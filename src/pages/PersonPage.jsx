import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  memo,
} from "react";
import {
  tmdbFetch,
  imgUrl,
} from "../utils/api";
import MediaCard from "../components/MediaCard";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  StarIcon,
  CalendarIcon,
  CloseIcon,
  ArrowUpIcon,
  PlayIcon,
} from "../components/Icons";

const ScrollRow = memo(function ScrollRow({ title, items, onSelect, className = "cards-row" }) {
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
      <div className={className} ref={rowRef}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </div>
  );
});

export default function PersonPage({
  personId,
  apiKey,
  onBack,
  onSelect,
}) {
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState(null);
  const [movieCredits, setMovieCredits] = useState({});
  const [tvCredits, setTvCredits] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const getYear = (date) => date?.slice(0, 4);

  const movieCast = useMemo(() => (movieCredits.cast || []).slice(0, 20).map((i) => ({ ...i, media_type: "movie" })), [movieCredits]);
  const movieCrew = useMemo(() => (movieCredits.crew || []).slice(0, 10).map((i) => ({ ...i, media_type: "movie" })), [movieCredits]);
  const tvCast = useMemo(() => (tvCredits.cast || []).slice(0, 20).map((i) => ({ ...i, media_type: "tv" })), [tvCredits]);
  const tvCrew = useMemo(() => (tvCredits.crew || []).slice(0, 10).map((i) => ({ ...i, media_type: "tv" })), [tvCredits]);

  const allCredits = useMemo(() => [...movieCast, ...tvCast], [movieCast, tvCast]);

  const birthday = person?.birthday ? new Date(person.birthday) : null;
  const deathday = person?.deathday ? new Date(person.deathday) : null;
  const age = birthday && !deathday ? Math.floor((Date.now() - birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const deathAge = birthday && deathday ? Math.floor((deathday.getTime() - birthday.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  if (loading) {
    return (
      <div className="fade-in">
        <div className="detail-hero">
          <div className="detail-content">
            <div className="skeleton" style={{ width: 200, height: 300, borderRadius: 12 }} />
            <div className="detail-info">
              <div className="skeleton" style={{ width: 300, height: 36, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: 200, height: 20, marginBottom: 24 }} />
              <div className="skeleton" style={{ width: "100%", height: 100 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!person) return null;

  return (
    <div className="fade-in">
      <div className="detail-hero">
        <div className="detail-bg" style={{ backgroundImage: person.profile_path ? `url(${imgUrl(person.profile_path, "w1280")})` : "none" }} />
        <div className="detail-gradient" />
        <div className="detail-content">
          <div className="detail-poster">
            {person.profile_path ? (
              <img src={imgUrl(person.profile_path, "h632")} alt={person.name} loading="lazy" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface3)" }}>
                <StarIcon size={48} />
              </div>
            )}
          </div>
          <div className="detail-info">
            <div className="detail-type">Person</div>
            <div className="detail-title">{person.name}</div>

            {birthday && (
              <div className="detail-meta">
                <CalendarIcon size={14} />
                <span>
                  {getYear(person.birthday)}
                  {person.deathday && ` - ${getYear(person.deathday)}`}
                  {age && ` (${age} years old)`}
                  {deathAge && ` (${deathAge} years at death)`}
                </span>
              </div>
            )}

            {person.place_of_birth && (
              <div className="detail-meta" style={{ marginTop: 8 }}>
                <span style={{ color: "var(--text3)" }}>Born: {person.place_of_birth}</span>
              </div>
            )}

            {person.known_for_department && (
              <div className="genres" style={{ marginTop: 12 }}>
                <span className="genre-tag">{person.known_for_department}</span>
              </div>
            )}

            {person.biography && (
              <>
                <div className="detail-overview" style={{ marginTop: 16 }}>{person.biography}</div>
                {person.biography.length > 200 && (
                  <span className="more-link" onClick={() => {}}>Read More</span>
                )}
              </>
            )}

            {allCredits.length > 0 && (
              <div style={{ marginTop: 16, color: "var(--text2)", fontSize: 13 }}>
                Known for {allCredits.length} titles
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && (
        <div style={{ paddingBottom: 60 }}>
          {movieCast.length > 0 && (
            <ScrollRow
              title="Movie Credits"
              items={movieCast}
              onSelect={onSelect}
            />
          )}

          {tvCast.length > 0 && (
            <ScrollRow
              title="TV Show Credits"
              items={tvCast}
              onSelect={onSelect}
            />
          )}

          {movieCrew.length > 0 && (
            <ScrollRow
              title="Movie Crew"
              items={movieCrew}
              onSelect={onSelect}
            />
          )}

          {tvCrew.length > 0 && (
            <ScrollRow
              title="TV Crew"
              items={tvCrew}
              onSelect={onSelect}
            />
          )}
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