import { launchAndCapture } from "../live.ts";

export async function collect() {
  return (await launchAndCapture()).samples;
}
