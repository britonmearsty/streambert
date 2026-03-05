// ── App Update Utilities ──────────────────────────────────────────────────────
// Centralised update-check logic. Imported by both App.jsx and SettingsPage.jsx.

export const GITHUB_REPO = "truelockmc/streambert";

// Dynamically fetched from Electron on first use
export let APP_VERSION = "0.0.0";
if (typeof window !== "undefined" && window.electron?.getAppVersion) {
  window.electron.getAppVersion().then((v) => {
    APP_VERSION = v;
  });
}

// Normalise "1.3" → "1.3.0" so semver comparison works correctly
export function normaliseVersion(v) {
  const parts = String(v).replace(/^v/i, "").split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).map(Number);
}

// Returns true only when `a` is strictly greater than `b` (semver arrays)
export function semverGt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

export async function checkForUpdates() {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
    {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  const releases = await res.json();

  // Skip pre-releases and drafts, only consider stable published releases
  const data = Array.isArray(releases)
    ? releases.find((r) => !r.prerelease && !r.draft)
    : null;
  if (!data) throw new Error("No stable release found");

  const latestRaw = (data.tag_name || "").replace(/^v/i, "");
  const latestParts = normaliseVersion(latestRaw);
  const currentParts = normaliseVersion(APP_VERSION);
  const url =
    data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;

  // Map release assets to install formats
  const assets = {};
  for (const asset of data.assets || []) {
    const name = asset.name.toLowerCase();
    if (name.endsWith(".appimage"))
      assets.appimage = asset.browser_download_url;
    else if (name.endsWith(".deb")) assets.deb = asset.browser_download_url;
    else if (name.endsWith(".exe")) assets.exe = asset.browser_download_url;
  }

  return {
    latest: latestRaw || APP_VERSION,
    current: APP_VERSION,
    url,
    changelog: data.body || "",
    assets,
    hasUpdate: latestRaw !== "" && semverGt(latestParts, currentParts),
  };
}
