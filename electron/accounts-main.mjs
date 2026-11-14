export function accountsView(state) {
  const account = state?.account;
  if (!account?.id || state.status === "signed-out" || state.status === "connecting") return { active: null };
  return { active: { id: account.id, email: account.email, ...(state.status === "reauth-required" ? { signIn: true } : {}) } };
}

export function createDesktopRing() {
  const ring = () => null;
  ring.waiting = () => [];
  ring.close = () => {};
  return ring;
}

export function installAccounts({ ipcMain, ownPage, account, client, tell }) {
  const view = () => accountsView(account()?.state());
  const own = (channel, handler) => ipcMain.handle(channel, (event, ...args) => {
    if (!ownPage(event)) throw new Error(`${channel} is only available on this app's own page`);
    return handler(...args);
  });
  own("accounts:list", view);
  own("accounts:sign-out", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-start", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-verify", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-browser", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-reopen", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-result", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:add-cancel", () => ({ outcome: "unavailable", view: view() }));
  own("accounts:sheet-pending", () => false);
  own("accounts:sheet-closed", () => ({ outcome: "unavailable" }));
  ipcMain.handle("accounts:offered", () => false);
  ipcMain.handle("accounts:open", () => ({ outcome: "unavailable" }));
  return {
    view,
    tell,
    async signOutActive() {
      return client().state();
    },
  };
}
