// Browser-safe: the web app imports this, so it must not pull in Node-only modules.
export function teamPlan(state) {
  return state?.status === "connected" && !state.machine && state.entitlement?.plan === "pro" &&
    ["team", "business"].includes(state.entitlement.tier);
}
