// ── Home Page Layout Utilities ────────────────────────────────────────────────
// Shared between SettingsPage (editing) and HomePage (reading).

import { storage } from "./storage";

export const HOME_ROWS = [
  { id: "continue", label: "Continue Watching" },
  { id: "similar", label: "Similar to…" },
  { id: "trendingMovies", label: "Trending Movies" },
  { id: "trendingTV", label: "Trending Series" },
  { id: "topRated", label: "Top Rated" },
];

/**
 * Load the home layout config.
 *
 * @param {Array<{id:string, label:string}>} extraRows
 *   Optional dynamic rows (e.g. provider rows) to include.
 *   They are appended after the static HOME_ROWS in the default order
 *   but can be reordered by the user and saved normally.
 */
export function loadHomeLayout(extraRows = []) {
  const allRows = [...HOME_ROWS, ...extraRows];
  const savedOrder = storage.get("homeRowOrder");
  const savedVisible = storage.get("homeRowVisible");
  const knownIds = new Set(allRows.map((r) => r.id));

  const defaultOrder = allRows.map((r) => r.id);
  const defaultVisible = Object.fromEntries(allRows.map((r) => [r.id, true]));

  const order = savedOrder
    ? [
        ...savedOrder.filter((id) => knownIds.has(id)),
        ...defaultOrder.filter((id) => !savedOrder.includes(id)),
      ]
    : defaultOrder;

  const visible = savedVisible
    ? { ...defaultVisible, ...savedVisible }
    : defaultVisible;

  return { order, visible };
}

export function saveHomeLayout(order, visible) {
  storage.set("homeRowOrder", order);
  storage.set("homeRowVisible", visible);
}

export function loadStartPage() {
  return storage.get("startPage") || "home";
}
