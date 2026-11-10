import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(desktop, "..");
const bundle = path.join(desktop, "bundle");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function copyInto(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, dereference: true });
}

function slim(dir) {
  const dropDir = new Set(["@img", "sharp", "typescript", "caniuse-lite"]);
  const walk = (current) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (dropDir.has(entry.name) && current.endsWith(`${path.sep}node_modules`)) {
          fs.rmSync(full, { recursive: true, force: true });
          continue;
        }
        walk(full);
        continue;
      }
      const otherDb = /query_(compiler|engine)_bg\.(mysql|postgresql|sqlserver|cockroachdb)/.test(entry.name);
      const linuxEngine = entry.name.includes("debian") && entry.name.endsWith(".node");
      if (entry.name.endsWith(".map") || otherDb || linuxEngine) fs.rmSync(full, { force: true });
    }
  };
  walk(dir);
}

if (!fs.existsSync(path.join(desktop, "node_modules", "electron"))) {
  run("npm", ["ci"], { cwd: desktop });
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"], { env: { AGENCYOPS_DESKTOP: "1" } });

fs.rmSync(bundle, { recursive: true, force: true });
copyInto(path.join(root, ".next", "standalone"), bundle);
copyInto(path.join(root, ".next", "static"), path.join(bundle, ".next", "static"));
copyInto(path.join(root, "public"), path.join(bundle, "public"));
copyInto(path.join(root, "node_modules", ".prisma"), path.join(bundle, "node_modules", ".prisma"));
copyInto(path.join(root, "node_modules", "@prisma", "client"), path.join(bundle, "node_modules", "@prisma", "client"));
slim(bundle);

const engines = fs.readdirSync(path.join(bundle, "node_modules", ".prisma", "client"));
if (!engines.some((name) => name.includes("windows") && name.endsWith(".node"))) {
  console.error("Windows Prisma engine missing:", engines.join(", "));
  process.exit(1);
}

const template = path.join(bundle, "template.db");
fs.rmSync(template, { force: true });
const dbUrl = `file:${template}`;
run("npx", ["prisma", "migrate", "deploy"], { env: { DATABASE_URL: dbUrl } });
run("npx", ["tsx", "prisma/seed.ts"], {
  env: { DATABASE_URL: dbUrl, DEMO_MODE: "true", NODE_ENV: "production" },
});

run(path.join(desktop, "node_modules", ".bin", "electron-builder"), ["--win", "nsis", "--x64", "--config", "electron-builder.yml"], {
  cwd: desktop,
  env: { WINEDEBUG: "-all" },
});
