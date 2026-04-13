import { memo } from "react";
import MediaCard from "./MediaCard";
import { isRestricted } from "../utils/ageRating";

/**
 * Custom memo comparator: re-render the row only when props that actually
 * affect its output have changed. Crucially, `ratingsMap` is compared per-item
 * so loading a rating for Row A's items does NOT re-render Row B.
 */
function areEqual(prev, next) {
  if (
    prev.items !== next.items ||
    prev.title !== next.title ||
    prev.titleHighlight !== next.titleHighlight ||
    prev.onSelect !== next.onSelect ||
    prev.progress !== next.progress ||
    prev.watched !== next.watched ||
    prev.onMarkWatched !== next.onMarkWatched ||
    prev.onMarkUnwatched !== next.onMarkUnwatched ||
    prev.ageLimitSetting !== next.ageLimitSetting
  ) {
    return false;
  }
  // ratingsMap is a shared object that grows over time.
  // Only re-render if the rating for one of OUR items changed.
  if (prev.ratingsMap !== next.ratingsMap) {
    for (const item of next.items) {
      const pk = `${item.media_type === "tv" ? "tv" : "movie"}_${item.id}`;
      if (prev.ratingsMap[pk] !== next.ratingsMap[pk]) return false;
    }
  }
  return true;
}

export default memo(function HorizontalRow({
  items,
  title,
  titleHighlight,
  onSelect,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  ratingsMap = {},
  ageLimitSetting,
}) {
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
      <div className="horizontal-scroll">
        {items.map((item) => {
          const typeKey = item.media_type === "tv" ? "tv" : "movie";
          const pk = `${typeKey}_${item.id}`;
          const r = ratingsMap[pk] || { cert: null, minAge: null };
          const restricted = isRestricted(r.minAge, ageLimitSetting);
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
                restricted={restricted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}, areEqual);