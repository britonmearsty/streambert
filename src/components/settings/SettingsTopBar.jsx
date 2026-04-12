import React, { useState, useEffect, useRef } from "react";
import { HelpIcon } from "../Icons";

const SUPPORTS_HIGHLIGHT =
  typeof CSS !== "undefined" && typeof CSS.highlights !== "undefined";

const SECTION_NAV = [
  {
    id: "updates",
    label: "Updates & API",
    icon: "↑",
    keywords: [
      "update",
      "version",
      "tmdb",
      "api",
      "token",
      "key",
      "check",
      "startup",
      "auto",
      "app",
    ],
  },
  {
    id: "providers",
    label: "Watch Providers",
    icon: "📺",
    keywords: [
      "netflix",
      "hulu",
      "disney",
      "prime",
      "provider",
      "streaming",
      "region",
      "country",
    ],
  },
  {
    id: "content",
    label: "Age Rating",
    icon: "🔞",
    keywords: [
      "age",
      "rating",
      "parental",
      "content",
      "country",
      "restriction",
      "pg",
      "fsk",
      "adults",
    ],
  },
  {
    id: "playback",
    label: "Playback",
    icon: "▶",
    keywords: [
      "invidious",
      "trailer",
      "youtube",
      "threshold",
      "watched",
      "playback",
      "seconds",
      "mark",
      "auto-watched",
      "intro",
      "skip",
      "aniskip",
      "anime",
      "outro",
    ],
  },
  {
    id: "subtitles",
    label: "Subtitles",
    icon: "CC",
    keywords: [
      "subtitle",
      "subdl",
      "wyzie",
      "language",
      "caption",
      "srt",
      "download",
      "cc",
    ],
  },
  {
    id: "downloads",
    label: "Downloads",
    icon: "⬇",
    keywords: [
      "download",
      "folder",
      "path",
      "save",
      "video",
      "movies",
      "files",
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "🔔",
    keywords: [
      "notification",
      "notify",
      "alert",
      "desktop",
      "episode",
      "download",
      "watchlist",
      "new episode",
      "release",
    ],
  },
  {
    id: "interface",
    label: "Interface",
    icon: "✦",
    keywords: [
      "home",
      "layout",
      "start page",
      "appearance",
      "accent",
      "colour",
      "color",
      "font",
      "compact",
      "animation",
      "theme",
      "rows",
      "hero",
    ],
  },
  {
    id: "library",
    label: "Library",
    icon: "📚",
    keywords: [
      "library",
      "watchlist",
      "sort",
      "history",
      "privacy",
      "watch history",
      "continue",
    ],
  },
  {
    id: "backup",
    label: "Backup",
    icon: "💾",
    keywords: [
      "backup",
      "restore",
      "export",
      "import",
      "scheduled",
      "json",
      "backup file",
    ],
  },
  {
    id: "storage",
    label: "Storage & Data",
    icon: "🗄",
    keywords: [
      "storage",
      "cache",
      "clear",
      "reset",
      "delete",
      "data",
      "wipe",
      "progress",
      "factory",
    ],
  },
];

export const SettingsTopBar = React.memo(function SettingsTopBar({
  sectionRefs,
  contentRef,
  onShowShortcuts,
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const matchRanges = useRef([]);
  const currentMatchRef = useRef(0);
  const matchCountRef = useRef(0);
  const inputRef = useRef(null);
  const navRef = useRef(null);
  const searchBarRef = useRef(null);
  const debounceTimer = useRef(null);
  const rafHandle = useRef(null);

  const clearHighlights = () => {
    if (SUPPORTS_HIGHLIGHT) {
      CSS.highlights.delete("settings-search");
      CSS.highlights.delete("settings-search-active");
    }
    matchRanges.current = [];
    matchCountRef.current = 0;
    currentMatchRef.current = 0;
    setMatchCount(0);
    setCurrentMatch(0);
  };

  const scrollToRange = (range) => {
    if (!range) return;
    if (rafHandle.current) cancelAnimationFrame(rafHandle.current);
    rafHandle.current = requestAnimationFrame(() => {
      rafHandle.current = null;
      try {
        const el = range.startContainer.parentElement;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {}
    });
  };

  const setActiveMatch = (idx) => {
    const range = matchRanges.current[idx];
    if (!range) return;
    if (SUPPORTS_HIGHLIGHT) {
      CSS.highlights.set("settings-search-active", new Highlight(range));
    }
    scrollToRange(range);
    currentMatchRef.current = idx + 1;
    setCurrentMatch(idx + 1);
  };

  const runSearch = (searchQuery) => {
    clearHighlights();
    if (!contentRef?.current || !searchQuery.trim()) return;

    const str = searchQuery.toLowerCase();
    const ranges = [];
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.toLowerCase();
      let idx = 0;
      while ((idx = text.indexOf(str, idx)) !== -1) {
        const range = new Range();
        range.setStart(node, idx);
        range.setEnd(node, idx + searchQuery.length);
        ranges.push(range);
        idx += str.length;
      }
    }

    matchRanges.current = ranges;
    matchCountRef.current = ranges.length;
    setMatchCount(ranges.length);

    if (ranges.length > 0) {
      if (SUPPORTS_HIGHLIGHT) {
        const hl = new Highlight();
        for (const r of ranges) hl.add(r);
        CSS.highlights.set("settings-search", hl);
      }
      setActiveMatch(0);
    }
  };

  const findMatches = (searchQuery) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      runSearch(searchQuery);
    }, 80);
  };

  const goNext = () => {
    const total = matchCountRef.current;
    if (total === 0) return;
    const next = currentMatchRef.current < total ? currentMatchRef.current : 0;
    setActiveMatch(next);
  };

  const goPrev = () => {
    const total = matchCountRef.current;
    if (total === 0) return;
    const prev =
      currentMatchRef.current > 1 ? currentMatchRef.current - 2 : total - 1;
    setActiveMatch(prev);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    clearHighlights();
  };

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [searchOpen]);

  useEffect(
    () => () => {
      clearHighlights();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (rafHandle.current) cancelAnimationFrame(rafHandle.current);
    },
    [],
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        closeSearch();
        setNavOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
        return;
      }
      if (searchOpen && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target))
        setNavOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [navOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        clearHighlights();
        setSearchOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const scrollTo = (id) => {
    const el = sectionRefs[id]?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setNavOpen(false);
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    findMatches(val);
  };

  const noMatch = query.trim().length > 0 && matchCount === 0;
  const hasQuery = query.trim().length > 0;

  const navBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text2)",
    display: "flex",
    alignItems: "center",
    padding: "4px 5px",
    borderRadius: 5,
    transition: "background 0.1s",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--bg, #141414)",
        borderBottom: "1px solid var(--border)",
        padding: "0 48px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 0",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div
              ref={searchBarRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                maxWidth: 540,
                background: "var(--surface2)",
                border: `1px solid ${noMatch ? "#ff3860" : "var(--red)"}`,
                borderRadius: 8,
                padding: "5px 8px 5px 12px",
                boxShadow: `0 0 0 3px ${noMatch ? "rgba(255,56,96,0.1)" : "rgba(229,9,20,0.1)"}`,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                placeholder="Search on this page…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: noMatch ? "#ff3860" : "var(--text)",
                  fontFamily: "var(--font-body)",
                  minWidth: 0,
                }}
              />

              {hasQuery && (
                <span
                  style={{
                    fontSize: 12,
                    color: noMatch ? "#ff3860" : "var(--text3)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    padding: "0 8px",
                    borderLeft: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    margin: "0 2px",
                    flexShrink: 0,
                  }}
                >
                  {noMatch ? "No results" : `${currentMatch} / ${matchCount}`}
                </span>
              )}

              {matchCount > 0 && (
                <button
                  onClick={goPrev}
                  title="Previous match (Shift+Enter)"
                  style={navBtnStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}

              {matchCount > 0 && (
                <button
                  onClick={goNext}
                  title="Next match (Enter)"
                  style={navBtnStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}

              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    clearHighlights();
                    inputRef.current?.focus();
                  }}
                  title="Clear search"
                  style={{ ...navBtnStyle, color: "var(--text3)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              <button
                onClick={closeSearch}
                title="Close (Esc)"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  fontSize: 11,
                  padding: "3px 7px",
                  borderRadius: 4,
                  fontFamily: "var(--font-body)",
                  flexShrink: 0,
                  letterSpacing: 0.3,
                }}
              >
                Esc
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                color: "var(--text3)",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--surface2)")
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Search settings…
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontFamily: "monospace",
                  letterSpacing: 0.5,
                }}
              >
                ⌘K
              </span>
            </button>
          )}
        </div>

        <div ref={navRef} style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onShowShortcuts}
            title="Keyboard Shortcuts (?)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 34,
              height: 34,
              color: "var(--text3)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface3)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface2)";
              e.currentTarget.style.color = "var(--text3)";
            }}
          >
            <HelpIcon />
          </button>

          <button
            onClick={() => setNavOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: navOpen ? "var(--surface3)" : "var(--surface2)",
              border: `1px solid ${navOpen ? "var(--red)" : "var(--border)"}`,
              boxShadow: navOpen ? "0 0 0 3px rgba(229,9,20,0.1)" : "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              color: "var(--text)",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "var(--font-body)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="3" cy="6" r="1" fill="currentColor" />
              <circle cx="3" cy="12" r="1" fill="currentColor" />
              <circle cx="3" cy="18" r="1" fill="currentColor" />
            </svg>
            Jump to Section
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                transform: navOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {navOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 10001,
                background: "var(--surface3)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                minWidth: 230,
                padding: 6,
              }}
            >
              {SECTION_NAV.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => scrollTo(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13,
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    fontFamily: "var(--font-body)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.07)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span
                    style={{
                      width: 22,
                      textAlign: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text3)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
