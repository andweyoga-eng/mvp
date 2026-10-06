import { execSync } from "node:child_process";

const port = Number(process.env.PORT || "3000");

if (process.env.KEEP_PORT === "1" || process.env.KEEP_PORT === "true") {
  console.log(`[dev] KEEP_PORT set — skipping port ${port} cleanup`);
  process.exit(0);
}

function pidsOnPort(p: number): number[] {
  try {
    const out = execSync(`lsof -ti tcp:${p}`, { encoding: "utf8" }).trim();
    if (!out) return [];
    return [...new Set(out.split("\n").map((s) => Number(s.trim())).filter(Boolean))];
  } catch {
    return [];
  }
}

function processCommand(pid: number): string {
  try {
    return execSync(`ps -p ${pid} -o command=`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** Avoid killing unrelated apps that happen to share the dev port. */
function isLikelyDevServer(command: string): boolean {
  if (!command) return false;
  if (!/\b(node|tsx)\b/i.test(command)) return false;
  return (
    /server\/index\.ts/i.test(command) ||
    /dist\/index\.js/i.test(command) ||
    /rest-express/i.test(command)
  );
}

const pids = pidsOnPort(port);
if (pids.length === 0) {
  console.log(`[dev] Port ${port} is free`);
  process.exit(0);
}

const toKill: number[] = [];
const skipped: { pid: number; command: string }[] = [];

for (const pid of pids) {
  const command = processCommand(pid);
  if (isLikelyDevServer(command)) {
    toKill.push(pid);
  } else {
    skipped.push({ pid, command: command || "(unknown)" });
  }
}

if (toKill.length > 0) {
  console.log(
    `[dev] Port ${port} in use by dev server PID(s): ${toKill.join(", ")} — stopping`,
  );
  for (const pid of toKill) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already exited */
    }
  }
  // Brief pause so the port is released before tsx binds.
  execSync("sleep 0.5");
}

if (skipped.length > 0) {
  for (const { pid, command } of skipped) {
    console.warn(
      `[dev] Port ${port} still held by non-dev PID ${pid}: ${command}`,
    );
  }
  console.warn(
    `[dev] Stop that process manually, set PORT to another value, or use KEEP_PORT=1 and fix the conflict.`,
  );
  process.exit(1);
}

const remaining = pidsOnPort(port);
if (remaining.length > 0) {
  console.warn(`[dev] Port ${port} still in use after cleanup (PID ${remaining.join(", ")})`);
  process.exit(1);
}

console.log(`[dev] Port ${port} is free`);
