import { useState, useRef, useEffect } from "react";
import { imgUrl } from "../utils/api";
import {
  LayoutGrid,
  Search,
  Bookmark,
  Film,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Tv,
  Trophy,
  Radio,
  FolderArchive,
  CalendarDays,
  Home,
  Clapperboard,
  MonitorPlay,
  Sparkles,
  Library,
  History,
} from "lucide-react";

export default function Sidebar({
  page,
  onNavigate,
  onSearch,
  savedList,
  activeDownloads,
  onReorderSaved,
  onRemoveSaved,
  canGoBack,
  onBack,
  canGoForward,
  onForward,
}) {
  const [dragOver, setDragOver] = useState(null);
  const dragItem = useRef(null);
  const dragNode = useRef(null);

  const [contextMenu, setContextMenu] = useState(null); // { item, x, y }

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, []);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  };

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    dragNode.current = e.currentTarget;
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = "0.4";
    }, 0);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = "1";
    dragItem.current = null;
    dragNode.current = null;
    setDragOver(null);
  };

  const handleDragEnter = (e, index) => {
    if (dragItem.current === index) return;
    setDragOver(index);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const fromIndex = dragItem.current;
    if (fromIndex === null || fromIndex === dropIndex) return;

    const newList = [...savedList];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(dropIndex, 0, moved);

    const newOrder = newList.map((item) => `${item.media_type}_${item.id}`);
    onReorderSaved(newOrder);
    setDragOver(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };


  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        <button
          className={`sidebar-nav-btn ${!canGoBack ? "disabled" : ""}`}
          onClick={onBack}
          disabled={!canGoBack}
          title="Back"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className={`sidebar-nav-btn ${!canGoForward ? "disabled" : ""}`}
          onClick={onForward}
          disabled={!canGoForward}
          title="Forward"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="sidebar-nav-btn"
          onClick={onSearch}
          title="Search"
        >
          <Search size={16} />
        </button>
      </div>
      <div className="sidebar-group">
        <SideBtn
          active={page === "home"}
          onClick={() => onNavigate("home")}
          icon={<Home size={20} />}
          label="Home"
          showLabel
        />
        <SideBtn
          active={page === "movies"}
          onClick={() => onNavigate("movies")}
          icon={<Clapperboard size={20} />}
          label="Movies"
          showLabel
        />
        <SideBtn
          active={page === "tv-shows"}
          onClick={() => onNavigate("tv-shows")}
          icon={<Tv size={20} />}
          label="TV Shows"
          showLabel
        />
        <SideBtn
          active={page === "anime"}
          onClick={() => onNavigate("anime")}
          icon={<Sparkles size={20} />}
          label="Anime"
          showLabel
        />
        <SideBtn
          active={page === "coming-soon"}
          onClick={() => onNavigate("coming-soon")}
          icon={<CalendarDays size={20} />}
          label="Coming Soon"
          showLabel
        />
        <SideBtn
          active={page === "sports"}
          onClick={() => onNavigate("sports")}
          icon={<Trophy size={20} />}
          label="Sports"
          showLabel
        />
        <SideBtn
          active={page === "iptv"}
          onClick={() => onNavigate("iptv")}
          icon={<Radio size={20} />}
          label="Live TV"
          showLabel
        />
        <SideBtn
          active={page === "collections"}
          onClick={() => onNavigate("collections")}
          icon={<Library size={20} />}
          label="Collections"
          showLabel
        />
        <SideBtn
          active={page === "history"}
          onClick={() => onNavigate("history")}
          icon={<History size={20} />}
          label="History"
          showLabel
        />
        <SideBtn
          active={page === "downloads"}
          onClick={() => onNavigate("downloads")}
          icon={<Download size={20} />}
          label="Downloads"
          badge={activeDownloads > 0 ? activeDownloads : null}
          showLabel
        />
      </div>

      <div className="sidebar-group">
        <div className="sidebar-group-title">Saved</div>
        <div className="sidebar-saved">
          {savedList.map((item, index) => {
            const key = `${item.media_type}_${item.id}`;
            const title = item.title || item.name;
            return (
              <div
                key={key}
                className={`saved-thumb${dragOver === index ? " drag-over" : ""}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() =>
                  onNavigate(item.media_type === "tv" ? "tv" : "movie", item)
                }
                onContextMenu={(e) => handleContextMenu(e, item)}
                style={{ cursor: "grab", position: "relative" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                  {item.poster_path ? (
                    <img src={imgUrl(item.poster_path, "w200")} alt={title} />
                  ) : (
                    <div className="no-img" style={{ width: 40, height: "100%", flexShrink: 0 }}>
                      <Film size={20} />
                    </div>
                  )}
                  <span className="saved-thumb-title">{title}</span>
                </div>
                {dragOver === index && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: "var(--accent, #e50914)",
                      borderRadius: 2,
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>


      {contextMenu && (
        <div
          className="sidebar-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="sidebar-context-menu-item"
            onClick={() => {
              onRemoveSaved && onRemoveSaved(contextMenu.item);
              setContextMenu(null);
            }}
          >
            Remove
          </div>
        </div>
      )}
      <div className="sidebar-bottom">
        <SideBtn
          active={page === "settings"}
          onClick={() => onNavigate("settings")}
          icon={<Settings size={20} />}
          label="Settings"
          showLabel
        />
      </div>
    </div>
  );
}

function SideBtn({ active, onClick, icon, label, badge, showLabel = false }) {
  return (
    <button
      className={`sidebar-btn ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      {icon}
      {showLabel && <span className="sidebar-label">{label}</span>}
      {badge && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: "var(--red)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "16px",
            textAlign: "center",
            padding: "0 4px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
