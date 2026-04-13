import { storage } from "./storage";

export const FAVORITE_PROVIDERS_KEY = "favoriteProviders";
export const PINNED_PROVIDERS_KEY = "pinnedProviders";

/**
 * Returns saved favourite providers: [{ id, name, logo_path }]
 */
export function loadFavoriteProviders() {
  return storage.get(FAVORITE_PROVIDERS_KEY) || [];
}

export function saveFavoriteProviders(providers) {
  storage.set(FAVORITE_PROVIDERS_KEY, providers);
}

/**
 * Returns the IDs of providers pinned to the sidebar.
 */
export function loadPinnedProviderIds() {
  return storage.get(PINNED_PROVIDERS_KEY) || [];
}

export function savePinnedProviderIds(ids) {
  storage.set(PINNED_PROVIDERS_KEY, ids);
}

/**
 * Returns only the favourite providers that are also pinned.
 */
export function loadPinnedProviders() {
  const favorites = loadFavoriteProviders();
  const pinnedIds = new Set(loadPinnedProviderIds());
  return favorites.filter((p) => pinnedIds.has(p.id));
}

/**
 * Converts favourite providers into homeLayout extra-row descriptors.
 * e.g. { id: "provider_8", label: "Trending on Netflix" }
 */
export function getProviderRows() {
  return loadFavoriteProviders().map((p) => ({
    id: `provider_${p.id}`,
    label: `Trending on ${p.name}`,
  }));
}
