#!/usr/bin/env node
/**
 * agy-website-artifacts — Cross-Platform Installer (Local / Git / Global / Project)
 * Zero external dependencies. Works on Windows, macOS, and Linux (Node.js 18+).
 *
 * Usage:
 *   node install.mjs                          # Install globally into ~/.gemini/config/plugins/agy-website-artifacts
 *   node install.mjs --project /path/to/repo  # Install into <repo>/.agents/plugins/agy-website-artifacts
 *   node install.mjs --git <repo-url>         # Clone/pull from Git directly into the target plugins folder
 *   node install.mjs --uninstall              # Remove global installation
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLUGIN_NAME = "agy-website-artifacts";

const EXCLUDE_PREFIXES = [
  ".git",
  "server/.security.json",
  "server/.runtime-state.json",
  "server/.media-cache",
  "server/bin"
];

function parseArgs(argv) {
  const opts = { project: null, git: null, branch: null, uninstall: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project" || a === "-p") opts.project = argv[++i];
    else if (a === "--git" || a === "-g") opts.git = argv[++i];
    else if (a === "--branch" || a === "-b") opts.branch = argv[++i];
    else if (a === "--uninstall" || a === "-u") opts.uninstall = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        [
          `${PLUGIN_NAME} installer`,
          "",
          "Usage:",
          "  node install.mjs                          Install globally (~/.gemini/config/plugins/)",
          "  node install.mjs --project <dir>          Install into <dir>/.agents/plugins/",
          "  node install.mjs --git <url> [-b branch]  Install or update directly via git clone/pull",
          "  node install.mjs --uninstall [--project]  Remove installed plugin"
        ].join("\n")
      );
      process.exit(0);
    }
  }
  return opts;
}

function getTargetDir(opts) {
  if (opts.project) {
    return path.resolve(opts.project, ".agents", "plugins", PLUGIN_NAME);
  }
  return path.join(os.homedir(), ".gemini", "config", "plugins", PLUGIN_NAME);
}

function shouldExclude(relPosix) {
  return EXCLUDE_PREFIXES.some((p) => relPosix === p || relPosix.startsWith(p + "/"));
}

function copyTree(srcRoot, dstRoot, curDir = srcRoot) {
  fs.mkdirSync(dstRoot, { recursive: true });
  for (const entry of fs.readdirSync(curDir, { withFileTypes: true })) {
    const srcPath = path.join(curDir, entry.name);
    const relPosix = path.relative(srcRoot, srcPath).split(path.sep).join("/");
    if (shouldExclude(relPosix)) continue;
    const dstPath = path.join(dstRoot, relPosix);
    if (entry.isDirectory()) {
      fs.mkdirSync(dstPath, { recursive: true });
      copyTree(srcRoot, dstRoot, srcPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  return res.status === 0;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targetDir = getTargetDir(opts);

  if (opts.uninstall) {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`Removed ${PLUGIN_NAME} from ${targetDir}`);
    } else {
      console.log(`Nothing to remove at ${targetDir}`);
    }
    return;
  }

  if (opts.git) {
    const parentDir = path.dirname(targetDir);
    fs.mkdirSync(parentDir, { recursive: true });
    if (fs.existsSync(path.join(targetDir, ".git"))) {
      console.log(`Updating existing Git installation in ${targetDir}...`);
      const ok = run("git", ["pull", "--ff-only"], targetDir);
      if (!ok) process.exit(1);
    } else {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
      }
      const cloneArgs = ["clone", "--depth", "1"];
      if (opts.branch) cloneArgs.push("--branch", opts.branch);
      cloneArgs.push(opts.git, targetDir);
      console.log(`Cloning ${opts.git} into ${targetDir}...`);
      const ok = run("git", cloneArgs, parentDir);
      if (!ok) process.exit(1);
    }
  } else {
    if (path.resolve(__dirname) === path.resolve(targetDir)) {
      console.log(`Plugin is already located at ${targetDir}`);
    } else {
      console.log(`Installing ${PLUGIN_NAME} into ${targetDir}...`);
      copyTree(__dirname, targetDir);
    }
  }

  // Run strict validation if Antigravity CLI is installed
  const agyCmd = process.platform === "win32" ? "agy.exe" : "agy";
  const check = spawnSync(agyCmd, ["plugin", "validate", targetDir, "--strict"], {
    stdio: "inherit"
  });
  if (check.error) {
    console.log(`\nInstalled ${PLUGIN_NAME} to: ${targetDir}`);
    console.log("Restart Antigravity (or refresh MCP Servers) to activate.");
  } else if (check.status === 0) {
    console.log(`\nInstalled and validated ${PLUGIN_NAME} at: ${targetDir}`);
  } else {
    process.exit(check.status || 1);
  }
}

main();
