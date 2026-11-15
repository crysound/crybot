const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("island", {
  ready: () => ipcRenderer.invoke("island:ready"),
  action: action => ipcRenderer.invoke("island:action", action),
  send: (revision, text) => ipcRenderer.invoke("island:send", revision, text),
  respond: (revision, requestId, behavior) => ipcRenderer.invoke("island:respond", revision, requestId, behavior),
  open: revision => ipcRenderer.invoke("island:open", revision),
  onUpdate: listener => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on("island:update", handler);
    return () => ipcRenderer.removeListener("island:update", handler);
  },
});
