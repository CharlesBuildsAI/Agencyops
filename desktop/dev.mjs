import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(desktop, "..");
const electron = path.join(desktop, "node_modules", ".bin", "electron");
const url = process.env.AGENCYOPS_DEV_URL || "http://127.0.0.1:43123";

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

if (!fs.existsSync(electron)) {
  const install = spawnSync("npm", ["ci"], { cwd: desktop, stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

const port = Number(new URL(url).port || 80);
let devServer = null;
if (!(await portOpen(port))) {
  devServer = spawn("npm", ["run", "dev"], { cwd: root, stdio: "inherit" });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline && !(await portOpen(port))) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

const child = spawn(electron, ["."], {
  cwd: desktop,
  stdio: "inherit",
  env: { ...process.env, AGENCYOPS_DEV_URL: url },
});

child.on("exit", (code) => {
  if (devServer) devServer.kill();
  process.exit(code ?? 0);
});
process.on("SIGINT", () => {
  child.kill();
});
