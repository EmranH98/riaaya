import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import leadsHandler from "./api/leads.js";
import configHandler from "./api/config.js";
import communicationsHandler from "./api/communications.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4174);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(body);
      }
    });
    req.on("error", reject);
  });
}

function adaptResponse(res) {
  const adapted = {
    statusCode: 200,
    setHeader: (name, value) => res.setHeader(name, value),
    end: body => {
      res.statusCode = adapted.statusCode;
      res.end(body);
    }
  };
  return adapted;
}

function safePath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const resolved = normalize(join(root, requested));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/leads") {
    req.body = await collectBody(req);
    await leadsHandler(req, adaptResponse(res));
    return;
  }

  if (url.pathname === "/api/config") {
    await configHandler(req, adaptResponse(res));
    return;
  }

  if (url.pathname === "/api/communications") {
    req.body = await collectBody(req);
    await communicationsHandler(req, adaptResponse(res));
    return;
  }

  if (url.pathname === "/dashboard") {
    url.pathname = "/app.html";
  }

  const filePath = safePath(url.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`رعاية is running at http://localhost:${port}`);
});
