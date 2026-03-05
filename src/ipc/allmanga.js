// ── IPC: AllManga (allmanga.to) episode resolver + local player server ─────────
// Mirrors ani-cli's approach to resolve direct video URLs from AllAnime.
// Also hosts a minimal localhost HTTP server so the webview can play mp4/m3u8
// without triggering a file download.

const { ipcMain } = require("electron");
const https = require("https");
const http = require("http");

// ── AllAnime hex cipher (from ani-cli) ────────────────────────────────────────

const ALLANIME_HEX_MAP = {
  79: "A",
  "7a": "B",
  "7b": "C",
  "7c": "D",
  "7d": "E",
  "7e": "F",
  "7f": "G",
  70: "H",
  71: "I",
  72: "J",
  73: "K",
  74: "L",
  75: "M",
  76: "N",
  77: "O",
  68: "P",
  69: "Q",
  "6a": "R",
  "6b": "S",
  "6c": "T",
  "6d": "U",
  "6e": "V",
  "6f": "W",
  60: "X",
  61: "Y",
  62: "Z",
  59: "a",
  "5a": "b",
  "5b": "c",
  "5c": "d",
  "5d": "e",
  "5e": "f",
  "5f": "g",
  50: "h",
  51: "i",
  52: "j",
  53: "k",
  54: "l",
  55: "m",
  56: "n",
  57: "o",
  48: "p",
  49: "q",
  "4a": "r",
  "4b": "s",
  "4c": "t",
  "4d": "u",
  "4e": "v",
  "4f": "w",
  40: "x",
  41: "y",
  42: "z",
  "08": "0",
  "09": "1",
  "0a": "2",
  "0b": "3",
  "0c": "4",
  "0d": "5",
  "0e": "6",
  "0f": "7",
  "00": "8",
  "01": "9",
  15: "-",
  16: ".",
  67: "_",
  46: "~",
  "02": ":",
  17: "/",
  "07": "?",
  "1b": "#",
  63: "[",
  65: "]",
  78: "@",
  19: "!",
  "1c": "$",
  "1e": "&",
  10: "(",
  11: ")",
  12: "*",
  13: "+",
  14: ",",
  "03": ";",
  "05": "=",
  "1d": "%",
};

function decodeAllanimeUrl(encoded) {
  if (encoded.startsWith("--")) encoded = encoded.slice(2);
  let result = "";
  for (let i = 0; i < encoded.length; i += 2) {
    const pair = encoded.slice(i, i + 2);
    result +=
      ALLANIME_HEX_MAP[pair] !== undefined ? ALLANIME_HEX_MAP[pair] : pair;
  }
  return result.replace(/\\u002F/gi, "/").replace(/\\\|/g, "");
}

// ── Generic HTTPS GET helper ──────────────────────────────────────────────────

function httpsGet(urlStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
        Referer: "https://allmanga.to",
        Accept: "*/*",
        ...headers,
      },
    };
    const req = https.request(opts, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const loc = res.headers.location.startsWith("http")
          ? res.headers.location
          : u.origin + res.headers.location;
        httpsGet(loc, headers).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}

function allanimeGQL(variables, query) {
  const qs =
    "variables=" +
    encodeURIComponent(JSON.stringify(variables)) +
    "&query=" +
    encodeURIComponent(query);
  return httpsGet("https://api.allanime.day/api?" + qs);
}

function sanitizeTitle(t) {
  return t
    .replace(/[''`´]/g, "")
    .replace(/[:!.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── AniList: resolve correct season title for S2+ ────────────────────────────

function anilistSeasonTitle(baseTitle, seasonNumber) {
  return new Promise((resolve) => {
    const resolveS1 = seasonNumber <= 1;
    const query = `query($search:String){Media(search:$search,type:ANIME,sort:SEARCH_MATCH){title{english romaji}episodes relations{edges{relationType node{type format title{english romaji}episodes startDate{year}seasonYear}}}}}`;
    const body = JSON.stringify({ query, variables: { search: baseTitle } });
    const opts = {
      hostname: "graphql.anilist.co",
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const fallback = {
      title: baseTitle,
      romaji: null,
      episodes: null,
      nextTitle: null,
      nextRomaji: null,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const media = json?.data?.Media;
          if (!media) return resolve(fallback);

          const s1Romaji = media?.title?.romaji || null;
          const s1Episodes = media?.episodes || null;
          const sequels = (media.relations?.edges || [])
            .filter(
              (e) =>
                e.relationType === "SEQUEL" &&
                e.node.type === "ANIME" &&
                (e.node.format === "TV" || e.node.format === "TV_SHORT"),
            )
            .sort((a, b) => {
              const ya = a.node.startDate?.year || a.node.seasonYear || 9999;
              const yb = b.node.startDate?.year || b.node.seasonYear || 9999;
              return ya - yb;
            });

          const getTitle = (node) =>
            node.title?.english || node.title?.romaji || null;
          const getRomaji = (node) => node.title?.romaji || null;

          if (resolveS1) {
            const next = sequels[0]?.node ?? null;
            return resolve({
              title: media.title?.english || baseTitle,
              romaji: s1Romaji,
              episodes: s1Episodes,
              nextTitle: next ? getTitle(next) : null,
              nextRomaji: next ? getRomaji(next) : null,
            });
          }

          const target = sequels[seasonNumber - 2];
          if (!target) return resolve({ ...fallback, romaji: s1Romaji });

          const nextNode = sequels[seasonNumber - 1]?.node ?? null;
          resolve({
            title: getTitle(target.node) || baseTitle,
            romaji: getRomaji(target.node) || s1Romaji,
            episodes: target.node.episodes || null,
            nextTitle: nextNode ? getTitle(nextNode) : null,
            nextRomaji: nextNode ? getRomaji(nextNode) : null,
          });
        } catch {
          resolve(fallback);
        }
      });
    });
    req.on("error", () => resolve(fallback));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(fallback);
    });
    req.write(body);
    req.end();
  });
}

// ── Hardcoded show IDs / split seasons ────────────────────────────────────────

const HARDCODED_SHOW_IDS = {
  "jojo's bizarre adventure": [
    "MeX4czvkwKGo3zdDp", // S1
    "zyqDjR8te4z6taKyk", // S2
    "GTAQH8Z9K6WbAdXsS", // S3
    "JS9PzKiPanesGRvs5", // S4
    "b6xFsr7MDSMcJArB9", // S5
    "pwduJkjBLytqiWCvM", // S6
  ],
};

const SPLIT_SEASONS = {
  "spy x family": {
    1: [
      { from: 1, showId: null, offset: 0 },
      { from: 13, showId: "H8Aey6QXE7HSqwvW3", offset: 12 },
    ],
  },
};

const SEARCH_GQL = `query($search:SearchInput $limit:Int $page:Int $translationType:VaildTranslationTypeEnumType $countryOrigin:VaildCountryOriginEnumType){shows(search:$search limit:$limit page:$page translationType:$translationType countryOrigin:$countryOrigin){edges{_id name availableEpisodes __typename}}}`;
const EPISODE_GQL = `query($showId:String! $translationType:VaildTranslationTypeEnumType! $episodeString:String!){episode(showId:$showId translationType:$translationType episodeString:$episodeString){episodeString sourceUrls}}`;
const PROVIDER_PRIORITY = ["S-mp4", "Luf-Mp4", "Yt-mp4", "Default", "Sl-Hls"];

// ── Resolve from known show ID ─────────────────────────────────────────────────

async function resolveEpisodeFromId(showId, epStr, dubSub) {
  const candidates = [epStr];
  if (!epStr.includes(".")) candidates.push(epStr + ".0");

  let sourceUrls = null;
  for (const attempt of candidates) {
    const epRes = await allanimeGQL(
      { showId, translationType: dubSub, episodeString: attempt },
      EPISODE_GQL,
    );
    if (!epRes.body) continue;
    try {
      const urls = JSON.parse(epRes.body)?.data?.episode?.sourceUrls;
      if (urls?.length) {
        sourceUrls = urls;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!sourceUrls) return null;

  const decodedSources = sourceUrls
    .filter((s) => s.sourceUrl?.startsWith("--"))
    .map((s) => {
      let p = decodeAllanimeUrl(s.sourceUrl).replace("/clock", "/clock.json");
      return {
        sourceName: s.sourceName || "",
        priority: s.priority || 0,
        path: p,
      };
    })
    .sort((a, b) => {
      const ai = PROVIDER_PRIORITY.indexOf(a.sourceName);
      const bi = PROVIDER_PRIORITY.indexOf(b.sourceName);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  for (const src of decodedSources) {
    let fetchUrl = src.path;
    if (fetchUrl.startsWith("//")) fetchUrl = "https:" + fetchUrl;
    else if (fetchUrl.startsWith("/"))
      fetchUrl = "https://allanime.day" + fetchUrl;
    else if (!fetchUrl.startsWith("http"))
      fetchUrl = "https://allanime.day/" + fetchUrl;

    try {
      const linkRes = await httpsGet(fetchUrl, {
        Referer: "https://allmanga.to",
      });
      if (linkRes.status !== 200 || !linkRes.body) continue;
      let linkJson;
      try {
        linkJson = JSON.parse(linkRes.body);
      } catch {
        continue;
      }
      const links = linkJson?.links;
      if (!links?.length) continue;
      const allLinks = links.filter((l) => l.link);
      const mp4Links = allLinks.filter(
        (l) => !l.link.includes(".m3u8") && !l.link.includes("master."),
      );
      const candidates2 = mp4Links.length ? mp4Links : allLinks;
      if (!candidates2.length) continue;
      candidates2.sort(
        (a, b) =>
          (parseInt(b.resolutionStr) || 0) - (parseInt(a.resolutionStr) || 0),
      );
      const best = candidates2[0];
      return {
        ok: true,
        url: best.link,
        resolution: best.resolutionStr || "?",
        sourceName: src.sourceName,
        isDirectMp4: !best.link.includes(".m3u8"),
        referer: "https://allmanga.to",
      };
    } catch {
      continue;
    }
  }
  return null;
}

// ── Local player server ────────────────────────────────────────────────────────
// Serves a minimal HTML5 page so the webview plays mp4/m3u8 directly.

let _playerServer = null;
let _currentVideoUrl = null;
let _currentVideoReferer = "https://allmanga.to";
let _currentVideoStartTime = 0;

function buildPlayerHtml(videoUrl, startTime) {
  const isM3u8 = videoUrl.includes(".m3u8");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}video{width:100%;height:100%;object-fit:contain;display:block}</style>
</head><body>
<video id="v" src="${isM3u8 ? "" : "/proxy?url=" + encodeURIComponent(videoUrl)}" autoplay controls playsinline crossorigin="anonymous"></video>
${
  isM3u8
    ? `
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js"></script>
<script>
  const video=document.getElementById('v');
  const src=decodeURIComponent("${encodeURIComponent(videoUrl)}");
  const startTime=${startTime};
  if(Hls.isSupported()){
    const hls=new Hls({xhrSetup:(xhr)=>xhr.setRequestHeader('Referer','${_currentVideoReferer}')});
    hls.loadSource(src);hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED,()=>{if(startTime>0)video.currentTime=startTime;video.play().catch(()=>{});});
  }else if(video.canPlayType('application/vnd.apple.mpegurl')){
    video.src=src;
    if(startTime>0)video.addEventListener('loadedmetadata',()=>{video.currentTime=startTime;},{once:true});
  }
</script>`
    : startTime > 0
      ? `<script>
  const v=document.getElementById('v');
  v.addEventListener('loadedmetadata',()=>{v.currentTime=${startTime};},{once:true});
</script>`
      : ""
}
</body></html>`;
}

function getPlayerServer() {
  if (_playerServer) return Promise.resolve(_playerServer);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");

      if (url.pathname === "/player" || url.pathname === "/") {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Cache-Control": "no-store",
        });
        res.end(
          buildPlayerHtml(_currentVideoUrl || "", _currentVideoStartTime || 0),
        );
        return;
      }

      if (url.pathname === "/proxy") {
        const target = url.searchParams.get("url");
        if (!target) {
          res.writeHead(400);
          res.end();
          return;
        }
        try {
          const targetUrl = new URL(target);
          const lib = targetUrl.protocol === "https:" ? https : http;
          const proxyReq = lib.request(
            {
              hostname: targetUrl.hostname,
              path: targetUrl.pathname + targetUrl.search,
              method: req.method || "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
                Referer: _currentVideoReferer,
                Range: req.headers["range"] || "",
                Accept: "*/*",
              },
            },
            (proxyRes) => {
              const passHeaders = {};
              for (const h of [
                "content-type",
                "content-length",
                "content-range",
                "accept-ranges",
                "last-modified",
                "etag",
              ]) {
                if (proxyRes.headers[h]) passHeaders[h] = proxyRes.headers[h];
              }
              passHeaders["Access-Control-Allow-Origin"] = "*";
              passHeaders["Cache-Control"] = "no-store";
              res.writeHead(proxyRes.statusCode, passHeaders);
              proxyRes.pipe(res);
            },
          );
          proxyReq.on("error", () => {
            res.writeHead(502);
            res.end();
          });
          req.pipe(proxyReq);
        } catch {
          res.writeHead(500);
          res.end();
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(0, "127.0.0.1", () => {
      _playerServer = server;
      resolve(server);
    });
    server.on("error", reject);
  });
}

// ── IPC registration ──────────────────────────────────────────────────────────

function register() {
  ipcMain.handle("set-player-video", async (_, { url, referer, startTime }) => {
    _currentVideoUrl = url;
    _currentVideoReferer = referer || "https://allmanga.to";
    _currentVideoStartTime = startTime || 0;
    const server = await getPlayerServer();
    return { playerUrl: `http://127.0.0.1:${server.address().port}/player` };
  });

  ipcMain.handle(
    "resolve-allmanga",
    async (
      _,
      { title, seasonNumber, episodeNumber, isMovie, translationType },
    ) => {
      try {
        const season = seasonNumber || 1;
        const dubSub = translationType === "dub" ? "dub" : "sub";

        // 1. Check split season map
        if (!isMovie) {
          const splitParts = SPLIT_SEASONS[title.toLowerCase()]?.[season];
          if (splitParts) {
            let activePart = splitParts[0];
            for (const part of splitParts) {
              if (episodeNumber >= part.from) activePart = part;
            }
            const partEp = episodeNumber - activePart.offset;
            if (activePart.showId) {
              const result = await resolveEpisodeFromId(
                activePart.showId,
                String(partEp),
                dubSub,
              );
              if (result) return result;
            }
          }
        }

        // 2. Check hardcoded show IDs
        if (!isMovie) {
          const hardcodedIds = HARDCODED_SHOW_IDS[title.toLowerCase()];
          if (hardcodedIds) {
            const showId =
              hardcodedIds[season - 1] ?? hardcodedIds[hardcodedIds.length - 1];
            const result = await resolveEpisodeFromId(
              showId,
              String(episodeNumber),
              dubSub,
            );
            if (result) return result;
          }
        }

        // 3. AniList season title lookup
        const anilistResult = isMovie
          ? {
              title,
              romaji: null,
              episodes: null,
              nextTitle: null,
              nextRomaji: null,
            }
          : await anilistSeasonTitle(title, season);

        let searchTitle = anilistResult.title;
        let adjustedEpisodeNumber = episodeNumber;

        if (
          !isMovie &&
          anilistResult.episodes &&
          episodeNumber > anilistResult.episodes &&
          anilistResult.nextTitle
        ) {
          adjustedEpisodeNumber = episodeNumber - anilistResult.episodes;
          searchTitle = anilistResult.nextTitle;
        }

        const epStr = isMovie ? "1" : String(adjustedEpisodeNumber);

        // 4. Build search candidate list
        const candidateSet = new Set([
          searchTitle,
          sanitizeTitle(searchTitle),
          ...(anilistResult.romaji && searchTitle === anilistResult.title
            ? [anilistResult.romaji]
            : []),
          ...(anilistResult.nextRomaji &&
          searchTitle === anilistResult.nextTitle
            ? [anilistResult.nextRomaji]
            : []),
          title,
          sanitizeTitle(title),
        ]);
        const candidates = [...candidateSet].filter(Boolean);

        // 5. Search AllManga
        async function searchAllmanga(query) {
          const vars = {
            search: { allowAdult: false, allowUnknown: false, query },
            limit: 40,
            page: 1,
            translationType: dubSub,
            countryOrigin: "ALL",
          };
          const res = await allanimeGQL(vars, SEARCH_GQL);
          if (!res.body) return null;
          try {
            const edges = JSON.parse(res.body)?.data?.shows?.edges;
            return edges?.length ? edges : null;
          } catch {
            return null;
          }
        }

        let edges = null,
          matchedTitle = searchTitle;
        for (const candidate of candidates) {
          edges = await searchAllmanga(candidate);
          if (edges) {
            matchedTitle = candidate;
            break;
          }
        }
        if (!edges)
          return { ok: false, error: "No results for: " + searchTitle };

        const titleLower = matchedTitle.toLowerCase();
        const anime =
          edges.find((e) => (e.name || "").toLowerCase() === titleLower) ||
          edges[0];

        // 6. Get episode sourceUrls
        const epRes = await allanimeGQL(
          { showId: anime._id, translationType: dubSub, episodeString: epStr },
          EPISODE_GQL,
        );
        if (!epRes.body) return { ok: false, error: "Empty episode response" };

        let epJson;
        try {
          epJson = JSON.parse(epRes.body);
        } catch {
          return {
            ok: false,
            error: "Episode parse error: " + epRes.body.slice(0, 200),
          };
        }

        const sourceUrls = epJson?.data?.episode?.sourceUrls;
        if (!sourceUrls?.length)
          return { ok: false, error: "No sourceUrls for ep " + epStr };

        // 7. Decode and try each source
        const decodedSources = sourceUrls
          .filter((s) => s.sourceUrl?.startsWith("--"))
          .map((s) => {
            let p = decodeAllanimeUrl(s.sourceUrl).replace(
              "/clock",
              "/clock.json",
            );
            return {
              sourceName: s.sourceName || "",
              priority: s.priority || 0,
              path: p,
            };
          })
          .sort((a, b) => {
            const ai = PROVIDER_PRIORITY.indexOf(a.sourceName);
            const bi = PROVIDER_PRIORITY.indexOf(b.sourceName);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          });

        const debugPaths = [];
        for (const src of decodedSources) {
          let fetchUrl = src.path;
          if (fetchUrl.startsWith("//")) fetchUrl = "https:" + fetchUrl;
          else if (fetchUrl.startsWith("/"))
            fetchUrl = "https://allanime.day" + fetchUrl;
          else if (!fetchUrl.startsWith("http"))
            fetchUrl = "https://allanime.day/" + fetchUrl;

          debugPaths.push(`[${src.sourceName}] ${fetchUrl}`);

          try {
            const linkRes = await httpsGet(fetchUrl, {
              Referer: "https://allmanga.to",
            });
            if (linkRes.status !== 200 || !linkRes.body) continue;
            let linkJson;
            try {
              linkJson = JSON.parse(linkRes.body);
            } catch {
              continue;
            }
            const links = linkJson?.links;
            if (!links?.length) continue;
            const allLinks = links.filter((l) => l.link);
            const mp4Links = allLinks.filter(
              (l) => !l.link.includes(".m3u8") && !l.link.includes("master."),
            );
            const candidates2 = mp4Links.length ? mp4Links : allLinks;
            if (!candidates2.length) continue;
            candidates2.sort(
              (a, b) =>
                (parseInt(b.resolutionStr) || 0) -
                (parseInt(a.resolutionStr) || 0),
            );
            const best = candidates2[0];
            return {
              ok: true,
              url: best.link,
              resolution: best.resolutionStr || "?",
              sourceName: src.sourceName,
              searchTitle,
              isDirectMp4: !best.link.includes(".m3u8"),
              referer: "https://allmanga.to",
            };
          } catch {
            continue;
          }
        }

        return {
          ok: false,
          error: "No playable link found. Tried: " + debugPaths.join(" | "),
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },
  );

  ipcMain.handle("debug-allmanga", async (_, args) => {
    try {
      if (args.path) {
        const url = args.path.startsWith("http")
          ? args.path
          : "https://allanime.day" + args.path;
        const r = await httpsGet(url, { Referer: "https://allmanga.to" });
        return { status: r.status, body: r.body.slice(0, 3000) };
      }
      if (args.showId) {
        const vars = {
          showId: args.showId,
          translationType: "sub",
          episodeString: String(args.epNum || 1),
        };
        const r = await allanimeGQL(vars, EPISODE_GQL);
        let parsed;
        try {
          parsed = JSON.parse(r.body);
        } catch {}
        if (parsed?.data?.episode?.sourceUrls) {
          parsed._decoded = parsed.data.episode.sourceUrls
            .filter((s) => s.sourceUrl?.startsWith("--"))
            .map((s) => {
              let p = decodeAllanimeUrl(s.sourceUrl).replace(
                "/clock",
                "/clock.json",
              );
              let fetchUrl = p.startsWith("//")
                ? "https:" + p
                : p.startsWith("/")
                  ? "https://allanime.day" + p
                  : p.startsWith("http")
                    ? p
                    : "https://allanime.day/" + p;
              return { sourceName: s.sourceName, path: p, fetchUrl };
            });
        }
        return { status: r.status, parsed, raw: r.body.slice(0, 2000) };
      }
      const season = args.season || 1;
      const resolvedTitle = await anilistSeasonTitle(args.title || "", season);
      const vars = {
        search: {
          allowAdult: false,
          allowUnknown: false,
          query: resolvedTitle,
        },
        limit: 10,
        page: 1,
        translationType: "sub",
        countryOrigin: "ALL",
      };
      const r = await allanimeGQL(vars, SEARCH_GQL);
      return { resolvedTitle, status: r.status, body: r.body.slice(0, 3000) };
    } catch (e) {
      return { error: e.message };
    }
  });
}

module.exports = { register };
