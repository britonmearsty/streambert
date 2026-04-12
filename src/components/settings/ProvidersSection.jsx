import React, { useState, useEffect } from "react";
import { storage, STORAGE_KEYS } from "../../utils/storage";
import { fetchWatchProviders, imgUrl } from "../../utils/api";
import { RATING_COUNTRIES } from "../../utils/ageRating";
import { SettingsSelect } from "./SettingsSelect";
import { Toggle } from "./Toggle";

const ProviderCard = React.memo(({ p, isFav, toggleFavorite }) => (
  <div
    onClick={() => toggleFavorite(p)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 10px",
      borderRadius: 8,
      cursor: "pointer",
      background: isFav ? "rgba(229,9,20,0.12)" : "transparent",
      border: `1px solid ${isFav ? "var(--red)" : "transparent"}`,
      transition: "all 0.15s",
    }}
    onMouseEnter={(e) => {
      if (!isFav) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
    }}
    onMouseLeave={(e) => {
      if (!isFav) e.currentTarget.style.background = "transparent";
    }}
  >
    <img
      src={imgUrl(p.logo_path, "w92")}
      alt={p.provider_name}
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontSize: 12,
        fontWeight: isFav ? 600 : 400,
        color: isFav ? "var(--text)" : "var(--text2)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {p.provider_name}
    </span>
  </div>
));

export const ProvidersSection = React.memo(function ProvidersSection({ apiKey }) {
  const [region, setRegion] = useState(
    () => storage.get(STORAGE_KEYS.WATCH_REGION) || "US",
  );
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(
    () => storage.get(STORAGE_KEYS.FAVORITE_PROVIDERS) || [],
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    fetchWatchProviders(apiKey, region)
      .then((res) => {
        const providers = res.slice(0, 40);
        setFavorites((prev) => {
          let changed = false;
          const next = prev.map((f) => {
            if (f.logo_path) return f;
            const match = providers.find((p) => p.provider_id === f.id);
            if (match) {
              changed = true;
              return { ...f, logo_path: match.logo_path };
            }
            return f;
          });
          if (changed) {
            storage.set(STORAGE_KEYS.FAVORITE_PROVIDERS, next);
            window.dispatchEvent(
              new CustomEvent("streambert:providers-changed"),
            );
          }
          return next;
        });
        setProviders(providers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiKey, region]);

  const toggleFavorite = React.useCallback((p) => {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === p.provider_id);
      if (exists) return prev.filter((f) => f.id !== p.provider_id);
      return [
        ...prev,
        {
          id: p.provider_id,
          name: p.provider_name,
          logo_path: p.logo_path,
        },
      ];
    });
  }, []);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.WATCH_REGION, region);
    storage.set(STORAGE_KEYS.FAVORITE_PROVIDERS, favorites);
    window.dispatchEvent(new CustomEvent("streambert:providers-changed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Streaming Services</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Select your favorite streaming services to pin them to the sidebar for
        quick access. Content recommendations on Home will also prioritize
        these services.
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          Watch Region
        </div>
        <SettingsSelect
          value={region}
          onChange={setRegion}
          options={RATING_COUNTRIES.map((c) => ({
            value: c.code,
            label: c.label,
          }))}
        />
      </div>

      {loading && (
        <div style={{ padding: "20px 0", color: "var(--text3)", fontSize: 13 }}>
          Loading providers…
        </div>
      )}

      {!loading && providers.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
            maxHeight: 320,
            overflowY: "auto",
            padding: "4px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          {providers.map((p) => (
            <ProviderCard
              key={p.provider_id}
              p={p}
              isFav={favorites.some((f) => f.id === p.provider_id)}
              toggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Providers
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>✓ Saved</span>
        )}
      </div>
    </div>
  );
});
