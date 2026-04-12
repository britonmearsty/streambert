import { useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { FilmIcon, LoaderIcon } from "../components/Icons";
import MediaCard from "../components/MediaCard";

export default function CollectionsPage({ onSelect, onNavigate }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = storage.get(STORAGE_KEYS.COLLECTIONS) || [];
    setCollections(stored);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="loader" style={{ marginTop: 80 }}>
          <LoaderIcon size={32} />
        </div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Collections</h1>
        </div>
        <div style={{ padding: 40, color: "var(--text3)", textAlign: "center" }}>
          <FilmIcon />
          <p style={{ marginTop: 16 }}>No collections yet</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Collections will appear here when you create them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Collections</h1>
      </div>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
        gap: "24px 16px",
        padding: "0 24px"
      }}>
        {collections.map((collection) => (
          <div
            key={collection.id}
            style={{ cursor: "pointer" }}
            onClick={() => onNavigate("collection", collection)}
          >
            <MediaCard
              item={{
                title: collection.title,
                poster_path: collection.poster_path,
                name: collection.title,
                media_type: "collection",
              }}
              onClick={() => onNavigate("collection", collection)}
            />
            <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6, textAlign: "center" }}>
              {collection.media?.length || 0} items
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}