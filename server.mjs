import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import communicationsHandler from "./api/communications.js";
import authHandler from "./api/auth.js";
import clinicHandler from "./api/clinic.js";
import ownerHandler from "./api/owner.js";
import publicHandler from "./api/public.js";
import { db } from "./lib/database.js";

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
      if (body.length > 5 * 1024 * 1024) {
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

async function attachBody(req, res) {
  try {
    req.body = await collectBody(req);
    return true;
  } catch {
    res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "request_body_too_large" }));
    return false;
  }
}

function safePath(pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const resolved = normalize(join(root, requested));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function sendHealth(res) {
  try {
    db.prepare("select 1 as ok").get();
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify({
      ok: true,
      service: "riaaya",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    res.writeHead(503, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    res.end(JSON.stringify({ ok: false, error: "database_unavailable" }));
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );

  if (url.pathname.startsWith("/api/auth/")) {
    if (!await attachBody(req, res)) return;
    await authHandler(req, adaptResponse(res), url);
    return;
  }

  if (
    url.pathname === "/api/clinic-state"
    || url.pathname === "/api/clinic-storage-status"
    || url.pathname === "/api/clinic-export"
    || url.pathname.startsWith("/api/clinic-users")
    || url.pathname === "/api/clinic-integrations"
  ) {
    if (!await attachBody(req, res)) return;
    await clinicHandler(req, adaptResponse(res), url);
    return;
  }

  if (url.pathname.startsWith("/api/owner/")) {
    if (!await attachBody(req, res)) return;
    await ownerHandler(req, adaptResponse(res), url);
    return;
  }

  if (url.pathname.startsWith("/api/public/")) {
    await publicHandler(req, adaptResponse(res), url);
    return;
  }

  if (url.pathname === "/healthz" || url.pathname === "/readyz") {
    sendHealth(res);
    return;
  }

  if (url.pathname === "/api/communications") {
    if (!await attachBody(req, res)) return;
    await communicationsHandler(req, adaptResponse(res));
    return;
  }

  /* Public clinic booking pages: /book/:slug → booking.html */
  if (/^\/book\/[a-z0-9-]+$/i.test(url.pathname)) {
    url.pathname = "/booking.html";
  }

  if (url.pathname === "/dashboard") {
    url.pathname = "/app.html";
  }

  if (url.pathname === "/app") {
    url.pathname = "/app.html";
  }

  if (url.pathname === "/login" || url.pathname === "/register" || url.pathname === "/trial") {
    url.pathname = "/auth.html";
  }

  if (url.pathname === "/owner") {
    url.pathname = "/owner.html";
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

function shutdown(signal) {
  console.log(`${signal} received, shutting down رعاية`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
