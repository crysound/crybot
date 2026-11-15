/** Public screen inventory; credentials are returned only by an authorized viewer or join request. */
export interface ScreenListPayload {
  layout: "single" | "multi";
  screens: number;
  slots: Array<{
    screen: number;
    state: "off" | "starting" | "ready" | "stopping" | "failed";
    bot: { id: string; name: string } | null;
    viewerTarget: string;
    controlledByPerson: boolean;
    idleSeconds: number | null;
  }>;
  queue: Array<{ bot: { id: string; name: string }; position: number; waitingSeconds: number }>;
}
