import { Server } from "node:net";

const descriptors = new Map([
  [Number(process.env.CRYBOT_PORT), 3],
  [Number(process.env.CRYBOT_WEBHOOK_PORT), 4],
]);
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args: unknown[]) {
  const fd = typeof args[0] === "number" ? descriptors.get(args[0]) : undefined;
  if (fd === undefined) return Reflect.apply(listen, this, args);
  descriptors.delete(args[0] as number);
  const callback = args.find((arg) => typeof arg === "function");
  return Reflect.apply(listen, this, [{ fd }, ...(callback ? [callback] : [])]);
};
