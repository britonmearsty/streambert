import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function HorizontalScroll({
  children,
  className = "",
  showButtons = true,
  scrollAmount = 220,
  variant = "horizontal-scroll",
}) {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir) => {
    containerRef.current?.scrollBy({
      left: dir * scrollAmount,
      behavior: "smooth",
    });
  };

  const scrollClass = variant === "scroll-row" ? "scroll-row" : "horizontal-scroll";

  return (
    <div className={`scroll-row-wrap ${className}`}>
      {showButtons && (
        <>
          <button
            className={`scroll-nav scroll-nav--left ${canScrollLeft ? "visible" : ""}`}
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft />
          </button>
          <button
            className={`scroll-nav scroll-nav--right ${canScrollRight ? "visible" : ""}`}
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight />
          </button>
        </>
      )}
      <div className={scrollClass} ref={containerRef} onScroll={checkScroll}>
        {children}
      </div>
    </div>
  );
}