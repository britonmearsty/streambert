const { ipcMain } = require("electron");
const https = require("https");

const STREAMED_BASE = "https://streamed.pk/api";

function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    function doGet(url) {
      const u = new URL(url);
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            Accept: "application/json",
            Referer: "https://streamed.pk/",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const loc = res.headers.location.startsWith("http")
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            res.resume();
            doGet(loc);
            return;
          }
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (e) {
              reject(new Error("Failed to parse JSON"));
            }
          });
        },
      );
      req.on("error", reject);
      req.setTimeout(12000, () => {
        req.destroy();
        reject(new Error("timeout"));
      });
      req.end();
    }
    doGet(urlStr);
  });
}

function register() {
  ipcMain.handle("sports-get-sports", async () => {
    try {
      return await httpsGet(`${STREAMED_BASE}/sports`);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("sports-get-matches", async (_, sport) => {
    try {
      const endpoint = sport && sport !== "all" ? `/matches/${sport}` : "/matches/all";
      return await httpsGet(`${STREAMED_BASE}${endpoint}`);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("sports-get-live-matches", async () => {
    try {
      return await httpsGet(`${STREAMED_BASE}/matches/live`);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("sports-get-popular-matches", async () => {
    try {
      return await httpsGet(`${STREAMED_BASE}/matches/all/popular`);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("sports-get-today-matches", async () => {
    try {
      return await httpsGet(`${STREAMED_BASE}/matches/all-today`);
    } catch (e) {
      return { error: e.message };
    }
  });

  ipcMain.handle("sports-get-streams", async (_, { source, id }) => {
    try {
      return await httpsGet(`${STREAMED_BASE}/stream/${source}/${id}`);
    } catch (e) {
      return { error: e.message };
    }
  });
}

module.exports = { register };
