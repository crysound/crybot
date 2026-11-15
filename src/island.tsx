import { createRoot } from "react-dom/client";
import { Island } from "./island/Island";
import { loadLocale } from "./lib/i18n";
import type { IslandBridge } from "../shared/island";
import "./island/island.css";

declare global { interface Window { island?: IslandBridge } }

const bridge = window.island;
if (bridge) {
  const root = createRoot(document.getElementById("root")!);
  let generation = 0;
  let shownLanguage = "";
  const paint = async (value: Awaited<ReturnType<IslandBridge["ready"]>>) => {
    const turn = ++generation;
    if (shownLanguage !== value.language) { await loadLocale(value.language); shownLanguage = value.language; }
    if (turn === generation) root.render(<Island {...value} bridge={bridge} />);
  };
  document.addEventListener("pointerdown", event => {
    if (event.target instanceof Element && !event.target.closest(".island")) void bridge.action({ type: "outside" });
  });
  bridge.onUpdate(value => { void paint(value); });
  void bridge.ready().then(paint);
}
