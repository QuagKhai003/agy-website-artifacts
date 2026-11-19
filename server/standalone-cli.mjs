#!/usr/bin/env node
/**
 * Standalone CLI & Daemon controller for agy-website-artifacts
 * Allows publishing HTML/React artifacts or local web apps immediately from skills/terminal
 * and shares state with mcp-server.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.AGY_DATA_DIR ? path.resolve(process.env.AGY_DATA_DIR) : __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
const STATE_FILE = path.join(DATA_DIR, ".runtime-state.json");
const MCP_SERVER_PATH = path.join(__dirname, "mcp-server.mjs");

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch (_) {}
  return {
    gatewayPort: Number(process.env.AGY_IFRAME_PORT || 4580),
    lanIp: getLanIp(),
    publicTunnelUrl: null,
    upstreamUiOrigin: null,
    artifacts: [],
    appRoutes: []
  };
}

function writeState(state) {
  state.lanIp = getLanIp();
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function checkGatewayAlive(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/__agy_status__`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureDaemonRunning() {
  const state = readState();
  const port = state.gatewayPort || 4580;
  if (await checkGatewayAlive(port)) {
    return readState();
  }

  const child = spawn(process.execPath, [MCP_SERVER_PATH, "--daemon"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const current = readState();
    if (await checkGatewayAlive(current.gatewayPort || 4580)) {
      // Wait up to 3 more seconds if publicTunnelUrl is still negotiating
      for (let j = 0; j < 8; j++) {
        const s = readState();
        if (s.publicTunnelUrl) return s;
        await new Promise((r) => setTimeout(r, 400));
      }
      return readState();
    }
  }
  return readState();
}

const [, , cmd, ...rest] = process.argv;

async function main() {
  if (cmd === "publish-artifact") {
    // Usage: node standalone-cli.mjs publish-artifact <title> <file-path> [html|react]
    const [title, filePath, type = "html"] = rest;
    const code = fs.readFileSync(path.resolve(filePath), "utf8");
    const state = await ensureDaemonRunning();
    const id = crypto.randomBytes(4).toString("hex");
    state.artifacts = state.artifacts || [];
    state.artifacts.push({
      id,
      title: title || path.basename(filePath),
      type: type === "react" ? "react" : "html",
      code,
      createdAt: new Date().toISOString()
    });
    writeState(state);

    const port = state.gatewayPort || 4580;
    const lanIp = getLanIp();
    const rel = `/__agy_artifact__/${id}`;
    console.log(
      JSON.stringify(
        {
          id,
          title,
          localUrl: `http://localhost:${port}${rel}#agy-iframe`,
          wifiUrl: `http://${lanIp}:${port}${rel}#agy-iframe`,
          mobile4gUrl: state.publicTunnelUrl ? `${state.publicTunnelUrl}${rel}#agy-iframe` : null
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === "publish-app") {
    // Usage: node standalone-cli.mjs publish-app <title> <target-url>
    const [title, targetUrl] = rest;
    const state = await ensureDaemonRunning();
    const id = crypto.randomBytes(4).toString("hex");
    state.appRoutes = state.appRoutes || [];
    state.appRoutes.push({
      id,
      title: title || targetUrl,
      targetOrigin: targetUrl,
      createdAt: new Date().toISOString()
    });
    writeState(state);

    const port = state.gatewayPort || 4580;
    const lanIp = getLanIp();
    const rel = `/__agy_app__/${id}/?shell=1`;
    console.log(
      JSON.stringify(
        {
          id,
          title,
          targetUrl,
          localUrl: `http://localhost:${port}${rel}#agy-iframe`,
          wifiUrl: `http://${lanIp}:${port}${rel}#agy-iframe`,
          mobile4gUrl: state.publicTunnelUrl ? `${state.publicTunnelUrl}${rel}#agy-iframe` : null
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === "status" || !cmd) {
    const state = await ensureDaemonRunning();
    console.log(JSON.stringify(state, null, 2));
    return;
  }
}

main();
