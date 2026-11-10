const { app, BrowserWindow, dialog, shell } = require("electron");
const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const net = require("net");
const path = require("path");

const DEV_URL = process.env.AGENCYOPS_DEV_URL || "";

app.setName("AgencyOps");
app.setAppUserModelId("com.charlesconnelly.agencyops");

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function iconPath() {
  const beside = path.join(process.resourcesPath, "icon.png");
  if (!DEV_URL && fs.existsSync(beside)) return beside;
  return path.join(__dirname, "icon.png");
}

function standaloneDir() {
  return path.join(process.resourcesPath, "standalone");
}

function databaseUrl(filePath) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function ensureSecret(dir) {
  const file = path.join(dir, "auth-secret");
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing.length >= 24) return existing;
  }
  const secret = crypto.randomBytes(32).toString("base64url");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

function prepareData(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, "agencyops.db");
  if (!fs.existsSync(dbPath)) {
    const template = path.join(standaloneDir(), "template.db");
    if (!fs.existsSync(template)) throw new Error("The demo database is missing from the app bundle.");
    fs.copyFileSync(template, dbPath);
  }
  return dbPath;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function waitFor(url) {
  const deadline = Date.now() + 45000;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then((response) => {
          if (response.status < 500) resolve();
          else retry();
        })
        .catch(retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error("The local desk did not start."));
        return;
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

let serverProcess = null;

function startServer(port, dbPath, secret) {
  const dir = standaloneDir();
  const logPath = path.join(app.getPath("userData"), "server.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });
  const base = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, [path.join(dir, "server.js")], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DEMO_MODE: "true",
      LLM_PROVIDER: "mock",
      CHANNEL_MODE: "mock",
      COMPUTER_PROVIDER: "stub",
      DEMO_WEBHOOK_SECRET: "demo",
      AUTH_SECRET: secret,
      DATABASE_URL: databaseUrl(dbPath),
      APP_URL: base,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.pipe(log);
  serverProcess.stderr.pipe(log);
  serverProcess.on("exit", (code) => {
    if (code && code !== 0) {
      dialog.showErrorBox("AgencyOps", `The local desk stopped (code ${code}). Details are in server.log.`);
    }
  });
  return base;
}

async function openWindow(url) {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "AgencyOps",
    icon: iconPath(),
    backgroundColor: "#304C90",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle("AgencyOps");
  });
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith("http://127.0.0.1") || target.startsWith("http://localhost")) return { action: "allow" };
    shell.openExternal(target);
    return { action: "deny" };
  });
  await window.loadURL(url);
  window.setTitle("AgencyOps");
}

app.on("second-instance", () => {
  const open = BrowserWindow.getAllWindows()[0];
  if (open) {
    if (open.isMinimized()) open.restore();
    open.focus();
  }
});

function stopServer() {
  if (serverProcess) serverProcess.kill();
}

app.on("window-all-closed", () => {
  stopServer();
  app.quit();
});

app.on("before-quit", stopServer);

if (gotLock) {
  app.whenReady().then(async () => {
    try {
      if (DEV_URL) {
        await openWindow(DEV_URL);
        return;
      }
      const dataDir = app.getPath("userData");
      const port = await freePort();
      const base = startServer(port, prepareData(dataDir), ensureSecret(dataDir));
      await waitFor(`${base}/login`);
      await openWindow(`${base}/login`);
    } catch (error) {
      dialog.showErrorBox("AgencyOps", error instanceof Error ? error.message : "The local desk did not start.");
      app.quit();
    }
  });
}
