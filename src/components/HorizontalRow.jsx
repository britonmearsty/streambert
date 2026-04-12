import { useRef, useCallback } from "react";
import MediaCard from "./MediaCard";

export default function HorizontalRow({
  items,
  title,
  titleHighlight,
  onSelect,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  getRating,
  itemRestricted,
}) {
  const scrollRef = useRef(null);

  const scroll = useCallback((direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="section">
      <div className="section-header">
        <div className="section-title">
          {titleHighlight ? (
            <>
              {title}&nbsp;
              <span style={{ color: "var(--red)" }}>{titleHighlight}</span>
            </>
          ) : (
            title
          )}
        </div>
      </div>
      <div className="horizontal-scroll" ref={scrollRef}>
        {items.map((item) => {
          const typeKey = item.media_type === "tv" ? "tv" : "movie";
          const pk = `${typeKey}_${item.id}`;
          const r = getRating(item);
          const restr = itemRestricted(item);
          return (
            <div key={pk} className="horizontal-scroll-item">
              <MediaCard
                item={item}
                onClick={() => onSelect(item)}
                progress={progress[pk] || 0}
                watched={watched}
                onMarkWatched={onMarkWatched}
                onMarkUnwatched={onMarkUnwatched}
                ageRating={r.cert}
                restricted={restr}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}