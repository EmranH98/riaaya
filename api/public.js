import { publicLandingSettings } from "../lib/database.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function publicHandler(_req, res, url) {
  if (url.pathname === "/api/public/landing-settings") {
    sendJson(res, 200, { ok: true, landing: publicLandingSettings() });
    return;
  }
  sendJson(res, 404, { error: "public_route_not_found" });
}
