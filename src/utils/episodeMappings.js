/**
 * Show-specific episode mappings.
 *
 * Some shows have a mismatch between TMDB season/episode numbering and
 * what streaming sources serve. TMDB may follow Netflix re-cuts or
 * combined-season numbering while sources use the original broadcast order.
 *
 * Each entry maps a TMDB show ID to a function that receives
 * { season, episode } as TMDB numbers and returns the corrected
 * { season, episode } to send to the streaming source.
 */

const MAPPINGS = {
  // ── Money Heist / La Casa de Papel (TMDB ID: 71446) ──────────────────────
  // TMDB follows original Spanish broadcast: S1 contains Part 1 (9 eps) +
  // Part 2 (6 eps) = 15 episodes total in one season.
  // Streaming sources use Part-based numbering: Part 1 = S1, Part 2 = S2,
  // Part 3 = S3, etc. — so every TMDB season after S1 is off by one.
  //
  // TMDB S1 E1–9   → source S1 E1–9   (Part 1, no change)
  // TMDB S1 E10–15 → source S2 E1–6   (Part 2)
  // TMDB S2        → source S3         (Part 3)
  // TMDB S3        → source S4         (Part 4)
  // TMDB S4        → source S5         (Part 5)
  71446: ({ season, episode }) => {
    if (season === 1) {
      if (episode <= 9) return { season: 1, episode };
      return { season: 2, episode: episode - 9 };
    }
    // All later TMDB seasons are shifted by one because S1 was split
    return { season: season + 1, episode };
  },
};

/**
 * Apply a show-specific episode mapping if one exists.
 * Falls through unchanged for shows without a mapping.
 *
 * @param {number|string} tmdbId
 * @param {number} season
 * @param {number} episode
 * @returns {{ season: number, episode: number }}
 */
export function applyEpisodeMapping(tmdbId, season, episode) {
  const fn = MAPPINGS[Number(tmdbId)];
  if (!fn) return { season, episode };
  return fn({ season, episode });
}
