import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import MediaCard from "../components/MediaCard";
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon, ArrowUpIcon, ChevronDownIcon } from "../components/Icons";
import { tmdbFetch, imgUrl } from "../utils/api";
import { useRatings } from "../utils/useRatings";
import { isRestricted } from "../utils/ageRating";

const MOVIE_GENRES = [
  { id: "", name: "All Genres" },
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "99", name: "Documentary" },
  { id: "18", name: "Drama" },
  { id: "10751", name: "Family" },
  { id: "14", name: "Fantasy" },
  { id: "36", name: "History" },
  { id: "27", name: "Horror" },
  { id: "10402", name: "Music" },
  { id: "9648", name: "Mystery" },
  { id: "10749", name: "Romance" },
  { id: "878", name: "Sci-Fi" },
  { id: "531", name: "Thriller" },
  { id: "10752", name: "War" },
  { id: "37", name: "Western" },
];

const TV_GENRES = [
  { id: "", name: "All Genres" },
  { id: "10759", name: "Action & Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "99", name: "Documentary" },
  { id: "18", name: "Drama" },
  { id: "10751", name: "Family" },
  { id: "10762", name: "Kids" },
  { id: "9648", name: "Mystery" },
  { id: "10765", name: "Sci-Fi & Fantasy" },
  { id: "10766", name: "Soap" },
  { id: "10767", name: "Talk" },
  { id: "10768", name: "War & Politics" },
  { id: "37", name: "Western" },
];

const SORT_OPTIONS = [
  { id: "popularity.desc", name: "Popularity" },
  { id: "vote_average.desc", name: "Top Rated" },
  { id: "primary_release_date.desc", name: "Newest" },
  { id: "vote_count.desc", name: "Most Voted" },
];

// ── Custom Dropdown Component ──────────────────────────────────────────────
const Dropdown = memo(({ value, options, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value) || options[0],
    [value, options]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="dropdown-container" ref={containerRef}>
      <div
        className={`dropdown-trigger ${isOpen ? "dropdown-trigger--active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.name || placeholder}</span>
        <ChevronDownIcon size={16} />
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          {options.map((opt) => (
            <div
              key={opt.id}
              className={`dropdown-item ${opt.id === value ? "dropdown-item--selected" : ""}`}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const DiscoverPage = memo(function DiscoverPage({
  type, // 'movies', 'tv-shows', 'anime', 'coming-soon'
  apiKey,
  onSelect,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [genre, setGenre] = useState("");
  const observer = useRef();

  const genres = useMemo(() => {
    if (type === "movies" || type === "coming-soon") return MOVIE_GENRES;
    return TV_GENRES;
  }, [type]);

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

  const lastElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  const getEndpoint = useCallback(() => {
    const isMovie = type === "movies" || type === "coming-soon";
    const base = isMovie ? "/discover/movie" : "/discover/tv";
    let params = `?sort_by=${sortBy}`;

    if (genre) params += `&with_genres=${genre}`;
    if (type === "anime") params += `&with_genres=16&with_original_language=ja`;
    if (type === "coming-soon") {
      const today = new Date().toISOString().split("T")[0];
      params += `&primary_release_date.gte=${today}`;
    }

    return `${base}${params}`;
  }, [type, sortBy, genre]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [type, sortBy, genre]);

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    const endpoint = getEndpoint();
    const separator = endpoint.includes("?") ? "&" : "?";
    
    tmdbFetch(`${endpoint}${separator}page=${page}`, apiKey)
      .then((data) => {
        const newItems = (data.results || []).map((item) => ({
          ...item,
          media_type: type === "movies" || type === "coming-soon" ? "movie" : "tv",
        }));
        setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]));
        setHasMore(data.page < data.total_pages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiKey, type, page, getEndpoint]);

  const { ratingsMap, ageLimitSetting } = useRatings(items);

  const title = useMemo(() => {
    switch (type) {
      case "movies": return "Popular Movies";
      case "tv-shows": return "Popular TV Shows";
      case "anime": return "Popular Anime";
      case "coming-soon": return "Coming Soon";
      default: return "Discover";
    }
  }, [type]);

  return (
    <div className="fade-in" style={{ padding: "24px 32px" }}>
      <div className="section-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>{title}</h1>
        
        <div style={{ display: "flex", gap: 12 }}>
          <Dropdown
            value={genre}
            options={genres}
            onChange={setGenre}
            placeholder="Select Genre"
          />
          
          <Dropdown
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            placeholder="Sort By"
          />
        </div>
      </div>

      <div className="discover-grid" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", 
        gap: "24px 16px" 
      }}>
        {items.map((item, index) => {
          const mediaType = item.media_type;
          const pk = mediaType === "movie" ? `movie_${item.id}` : `tv_${item.id}_s1e1`;
          const r = ratingsMap[`${mediaType}_${item.id}`] || {};
          
          const watchedKey = mediaType === "tv"
            ? item.season != null && item.episode != null
              ? `tv_${item.id}_s${item.season}e${item.episode}`
              : `tv_${item.id}`
            : `movie_${item.id}`;

          return (
            <div key={`${item.id}-${index}`} ref={index === items.length - 1 ? lastElementRef : null}>
              <MediaCard
                item={item}
                onClick={() => onSelect(item)}
                progress={progress[pk] || 0}
                isWatched={!!watched?.[watchedKey]}
                onMarkWatched={onMarkWatched}
                onMarkUnwatched={onMarkUnwatched}
                ageRating={r.cert}
                restricted={isRestricted(r.minAge, ageLimitSetting)}
              />
            </div>
          );
        })}

        {loading && Array.from({ length: 10 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="skeleton" style={{ height: 285, borderRadius: 10 }} />
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <p>No content found.</p>
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
});

export default DiscoverPage;
