interface InstaboxPanelStatus {
  backend?: string;
  machine?: { state: string } | null;
  configured?: boolean;
  ready?: boolean;
}

export function cloudPanelStatus<T extends InstaboxPanelStatus>(status: T): T & { box?: { state: string | null } } {
  if (status.backend !== "instabox") return status;
  const state = status.machine?.state;
  return { ...status, box: { state: status.ready ? "ready" : state === "suspended" || state === "stopped" ? "archived" : state ?? null } };
}
