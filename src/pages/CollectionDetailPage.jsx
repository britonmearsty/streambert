import { useState, useEffect } from "react";
import { FilmIcon, LoaderIcon } from "../components/Icons";
import MediaCard from "../components/MediaCard";

export default function CollectionDetailPage({ collection, onSelect, onBack }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [collection]);

  if (loading) {
    return (
      <div className="page">
        <div className="loader" style={{ marginTop: 80 }}>
          <LoaderIcon size={32} />
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="page">
        <div className="page-header">
          <button className="page-back" onClick={onBack}>← Back</button>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Collection not found</h1>
        </div>
      </div>
    );
  }

  const mediaList = collection.media || [];

  return (
    <div className="page">
      <div className="page-header">
        <button className="page-back" onClick={onBack}>← Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>{collection.title}</h1>
      </div>
      {mediaList.length === 0 ? (
        <div style={{ padding: 40, color: "var(--text3)", textAlign: "center" }}>
          <FilmIcon />
          <p style={{ marginTop: 16 }}>This collection is empty</p>
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", 
          gap: "24px 16px",
          padding: "0 24px"
        }}>
          {mediaList.map((item) => (
            <MediaCard
              key={`${item.media_type}_${item.id}`}
              item={item}
              onClick={() => onSelect(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}