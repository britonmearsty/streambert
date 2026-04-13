import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { ArrowUpIcon, ChevronDownIcon, StarIcon } from "../components/Icons";
import { tmdbFetch, imgUrl } from "../utils/api";

const DEPARTMENT_OPTIONS = [
  { id: "", name: "All Departments" },
  { id: "acting", name: "Acting" },
  { id: "directing", name: "Directing" },
  { id: "writing", name: "Writing" },
  { id: "production", name: "Production" },
  { id: "camera", name: "Camera" },
  { id: "editing", name: "Editing" },
  { id: "sound", name: "Sound" },
  { id: "art", name: "Art" },
  { id: "visual effects", name: "Visual Effects" },
  { id: "costume & make-up", name: "Costume & Make-up" },
  { id: "lighting", name: "Lighting" },
  { id: "crew", name: "Crew" },
];

const SORT_OPTIONS = [
  { id: "popularity.desc", name: "Popularity" },
  { id: "vote_average.desc", name: "Top Rated" },
];

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

const PersonCard = memo(function PersonCard({ person, onClick }) {
  if (!person) return null;

  const knownFor = person.known_for?.filter((i) => i.media_type) || [];
  const subtitles = knownFor.slice(0, 3).map((i) => i.title || i.name).join(", ");

  return (
    <div className="card" onClick={() => onClick(person)}>
      <div className="card-poster">
        {person.profile_path ? (
          <img src={imgUrl(person.profile_path, "h632")} alt={person.name} />
        ) : (
          <div className="no-poster">
            <StarIcon size={32} />
          </div>
        )}
      </div>
      <div className="card-info">
        <div className="card-title">{person.name}</div>
        <div className="card-year">{subtitles}</div>
      </div>
    </div>
  );
});

export default function PopularPeoplePage({
  apiKey,
  onNavigate,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [department, setDepartment] = useState("");
  const observer = useRef();

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

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [sortBy, department]);

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);

    let endpoint = `/person/popular?sort_by=${sortBy}&page=${page}`;
    
    tmdbFetch(endpoint, apiKey)
      .then((data) => {
        const newItems = (data.results || []).map((item) => ({
          ...item,
        }));
        setItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]));
        setHasMore(data.page < data.total_pages);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiKey, page, sortBy]);

  return (
    <div className="fade-in" style={{ padding: "24px 32px" }}>
      <div className="section-header" style={{
        marginBottom: 32,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        borderBottom: "1px solid var(--border)",
        paddingBottom: 24
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 2,
            color: "var(--red)"
          }}>
            Explore People
          </span>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Popular People</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text3)", fontSize: 13, fontWeight: 600 }}>
            <span>FILTER</span>
          </div>
          <Dropdown
            value={department}
            options={DEPARTMENT_OPTIONS}
            onChange={(val) => { setDepartment(val); setItems([]); setPage(1); setHasMore(true); }}
            placeholder="All Departments"
          />
        </div>
      </div>

      <div className="discover-grid" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", 
        gap: "24px 16px" 
      }}>
        {items.map((person, index) => (
          <div key={person.id} ref={index === items.length - 1 ? lastElementRef : null}>
            <PersonCard
              person={person}
              onClick={(person) => onNavigate("person", person)}
            />
          </div>
        ))}

        {loading && Array.from({ length: 10 }).map((_, i) => (
          <div key={`skeleton-${i}`} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
            <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
            <div style={{ padding: "8px 10px" }}>
              <div className="skeleton" style={{ height: 13, width: "80%", borderRadius: 4, marginBottom: 5 }} />
              <div className="skeleton" style={{ height: 11, width: "60%", borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <p>No people found.</p>
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