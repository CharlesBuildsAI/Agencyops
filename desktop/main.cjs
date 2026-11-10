const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
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
let desktopWindow = null;
let listenPort = 0;
let dbFile = "";

function secretsFile() {
  return path.join(app.getPath("userData"), "secrets.bin");
}

function readSecrets() {
  try {
    if (!fs.existsSync(secretsFile()) || !safeStorage.isEncryptionAvailable()) return {};
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(secretsFile())));
  } catch {
    return {};
  }
}

function writeSecrets(values) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("This computer cannot lock secrets. The OS keychain is unavailable.");
  }
  fs.writeFileSync(secretsFile(), safeStorage.encryptString(JSON.stringify(values)));
}

function secretEnv(port) {
  const saved = readSecrets();
  const llm = saved.ANTHROPIC_API_KEY || saved.OPENAI_API_KEY || "";
  const live = Boolean(saved.AGENTMAIL_API_KEY || saved.AGENTPHONE_API_KEY || saved.TWILIO_ACCOUNT_SID);
  return {
    ...saved,
    AGENTPHONE_BASE_URL: saved.AGENTPHONE_BASE_URL || "https://api.agentphone.ai",
    LLM_PROVIDER: llm ? "auto" : "mock",
    CHANNEL_MODE: live ? "live" : "mock",
    COMPUTER_PROVIDER: saved.ORGO_API_KEY ? "orgo" : "stub",
    DEMO_MODE: "true",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DEMO_WEBHOOK_SECRET: "demo",
    AUTH_SECRET: ensureSecret(app.getPath("userData")),
    APP_URL: `http://127.0.0.1:${port}`,
  };
}

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
      ...secretEnv(port),
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
  desktopWindow = window;
  await window.loadURL(url);
  window.setTitle("AgencyOps");
}

ipcMain.handle("secrets:save", async (_event, incoming) => {
  try {
    const next = { ...readSecrets(), ...(incoming || {}) };
    for (const key of Object.keys(next)) {
      if (!next[key]) delete next[key];
    }
    writeSecrets(next);
    if (serverProcess) {
      await new Promise((resolve) => {
        serverProcess.once("exit", resolve);
        serverProcess.kill();
      });
      serverProcess = null;
    }
    const base = startServer(listenPort, dbFile, ensureSecret(app.getPath("userData")));
    await waitFor(`${base}/setup`);
    if (desktopWindow) desktopWindow.reload();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not store keys." };
  }
});

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
      dbFile = prepareData(dataDir);
      listenPort = await freePort();
      const base = startServer(listenPort, dbFile, ensureSecret(dataDir));
      await waitFor(`${base}/setup`);
      await openWindow(`${base}/setup`);
    } catch (error) {
      dialog.showErrorBox("AgencyOps", error instanceof Error ? error.message : "The local desk did not start.");
      app.quit();
    }
  });
}
