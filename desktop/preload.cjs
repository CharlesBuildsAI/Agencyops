const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agencyops", {
  saveSecrets: (secrets) => ipcRenderer.invoke("secrets:save", secrets),
});
