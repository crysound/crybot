export const hostedAvailable = false;
export const hostedDisabledState = Object.freeze({ available: false, status: "unavailable", message: "disabled" });
const unavailable = () => Promise.resolve(hostedDisabledState);

export const disabledCloudAccount = Object.freeze({
  state: () => hostedDisabledState,
  begin: unavailable,
  reopen: unavailable,
  cancelEnrollment: unavailable,
  refresh: unavailable,
  disconnect: unavailable,
  requestBackup: unavailable,
  connection: () => null,
  pairHome: unavailable,
  growDisk: unavailable,
});

export function cloudTarget() {
  return { origin: "", staging: false, environments: "environments.json", sync: "cloud-sync" };
}

const hostedPlace = entry => Boolean(entry.home || entry.cloud || entry.team);

export function localEnvironmentsStore(store) {
  return {
    read() {
      const saved = store.read();
      const environments = saved.environments.filter(entry => !hostedPlace(entry));
      const activeId = environments.some(entry => entry.id === saved.activeId) ? saved.activeId : "local";
      return { ...saved, environments, activeId };
    },
    write(next) {
      const dormant = store.read().environments.filter(hostedPlace);
      const ids = new Set(next.environments.map(entry => entry.id));
      store.write({ ...next, environments: [...next.environments, ...dormant.filter(entry => !ids.has(entry.id))] });
    },
  };
}
