import { useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { FilmIcon } from "../components/Icons";
import { tmdbFetch, imgUrl } from "../utils/api";

const POPULAR_QUERIES = [
  "Star Wars", "Harry Potter", "Avengers", "Avatar",
  "The Lord of the Rings", "Indiana Jones", "Jurassic Park",
  "The Dark Knight", "James Bond", "Back to the Future",
  "Toy Story", "Pirates of the Caribbean", "Fast & Furious",
  "The Matrix", "The Hobbit", "The Hunger Games", "John Wick",
  "Mission: Impossible", "Spider-Man", "Alien", "Rocky",
  "Terminator", "Guardians of the Galaxy", "Iron Man",
  "Captain America", "Thor", "X-Men", "Transformers",
  "Planet of the Apes", "Despicable Me",
];

const CACHE_KEY = "popularCollectionsCache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function CollectionCard({ name, posterPath, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="card">
        <div className="card-poster">
          {posterPath ? (
            <img src={imgUrl(posterPath, "w342")} alt={name} loading="lazy" />
          ) : (
            <div className="no-poster"><FilmIcon size={32} /></div>
          )}
          <div className="card-overlay">
            <div className="card-play-btn">▶</div>
          </div>
        </div>
        <div className="card-info">
          <div className="card-title">{name}</div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage({ onSelect, onNavigate, apiKey }) {
  const [userCollections, setUserCollections] = useState([]);
  const [popularCollections, setPopularCollections] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    setUserCollections(storage.get(STORAGE_KEYS.COLLECTIONS) || []);
  }, []);

  useEffect(() => {
    if (!apiKey) { setLoadingPopular(false); return; }

    const cached = storage.get(CACHE_KEY);
    if (cached?.ts && Date.now() - cached.ts < CACHE_TTL && cached.collections?.length) {
      setPopularCollections(cached.collections);
      setLoadingPopular(false);
      return;
    }

    Promise.allSettled(
      POPULAR_QUERIES.map((query) =>
        tmdbFetch(`/search/collection?query=${encodeURIComponent(query)}`, apiKey)
          .then((data) => data.results?.[0] || null)
      )
    ).then((results) => {
      const seen = new Set();
      const collections = results
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value)
        .filter((c) => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setPopularCollections(collections);
      storage.set(CACHE_KEY, { collections, ts: Date.now() });
    }).finally(() => setLoadingPopular(false));
  }, [apiKey]);

  return (
    <div className="fade-in" style={{ padding: "24px 32px" }}>
      <div style={{
        marginBottom: 32,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 24,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "var(--red)" }}>
          Browse
        </span>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Collections</h1>
      </div>

      <div style={{ marginBottom: userCollections.length > 0 ? 48 : 0 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Popular Collections</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "24px 16px" }}>
          {loadingPopular
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface2)" }}>
                  <div className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 0 }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div className="skeleton" style={{ height: 13, width: "78%", borderRadius: 4, marginBottom: 5 }} />
                    <div className="skeleton" style={{ height: 11, width: "50%", borderRadius: 4 }} />
                  </div>
                </div>
              ))
            : popularCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  name={c.name}
                  posterPath={c.poster_path}
                  onClick={() => onNavigate("collection", { ...c, source: "tmdb" })}
                />
              ))
          }
        </div>
      </div>

      {userCollections.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Your Collections</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "24px 16px" }}>
            {userCollections.map((c) => (
              <CollectionCard
                key={c.id}
                name={c.title}
                posterPath={c.poster_path}
                onClick={() => onNavigate("collection", c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}