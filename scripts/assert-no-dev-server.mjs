#!/usr/bin/env node
/**
 * Refuses to start a build while this project's `next dev` is running.
 *
 * `next build` corrupts a live dev server's output. Setting `distDir` is not
 * enough on its own: Next transpiles `next.config.ts` into `.next` *before* it
 * has read the config, so `distDir` cannot protect that step. The symptom is
 * the dev server suddenly throwing `Cannot find module './NNNN.js'` and serving
 * 404s for `main-app.js` and friends, which looks like a code bug but is not.
 *
 * Recovery, if it already happened: stop the dev server, `rm -rf .next`, restart.
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let running = "";
try {
  // Match only this checkout's dev server — other projects' servers are fine,
  // and so is the `next start` we use to smoke-test a finished build.
  running = execSync(
    `ps ax -o pid=,command= | grep -F ${JSON.stringify(projectRoot)} | grep -F "next dev" | grep -v grep || true`,
    { encoding: "utf8" }
  ).trim();
} catch {
  // If process listing is unavailable, fail open rather than block the build.
  process.exit(0);
}

if (running) {
  console.error(
    "\n\x1b[31m✖ A dev server for this project is already running:\x1b[0m\n" +
      running
        .split("\n")
        .map((line) => `    ${line.trim()}`)
        .join("\n") +
      "\n\n  Building now would corrupt its .next output.\n" +
      "  Stop it first, or run the build from a checkout that has no dev server.\n"
  );
  process.exit(1);
}
