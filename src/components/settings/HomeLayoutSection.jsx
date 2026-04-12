import React, { useState, useEffect, useRef } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { loadHomeLayout } from "../../utils/homeLayout";
import { Toggle } from "./Toggle";

export const HomeLayoutSection = React.memo(function HomeLayoutSection() {
  const [order, setOrder] = useState([]);
  const [visible, setVisible] = useState({});
  const [allPossibleRows, setAllPossibleRows] = useState([]);
  const [saved, setSaved] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  useEffect(() => {
    const { order, visible, allPossibleRows } = loadHomeLayout();
    setOrder(order);
    setVisible(visible);
    setAllPossibleRows(allPossibleRows);
  }, []);

  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };
  const handleDragEnter = (idx) => {
    dragOver.current = idx;
  };
  const handleDragEnd = () => {
    const newOrder = [...order];
    const dragged = newOrder.splice(dragItem.current, 1)[0];
    newOrder.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setOrder(newOrder);
  };

  const toggleVisible = (id) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    storage.set(STORAGE_KEYS.HOME_ROW_ORDER, order);
    storage.set(STORAGE_KEYS.HOME_ROW_VISIBLE, visible);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const rowLabels = Object.fromEntries(
    allPossibleRows.map((r) => [r.id, r.label]),
  );

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Home Page Layout</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Choose which rows appear on the Home page and drag to reorder them. The
        hero banner is always shown at the top.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 480,
        }}
      >
        {order.map((id, idx) => (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "grab",
              opacity: visible[id] ? 1 : 0.45,
              transition: "opacity 0.2s",
              userSelect: "none",
            }}
          >
            <span
              style={{
                color: "var(--text3)",
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ⠿
            </span>

            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text)",
              }}
            >
              {rowLabels[id] || id}
            </span>

            <Toggle
              value={visible[id]}
              onChange={() => toggleVisible(id)}
              title={visible[id] ? "Hide row" : "Show row"}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          Save Layout
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
});
