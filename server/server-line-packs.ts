import zh from "../src/locales/zh.json" with { type: "json" };
import { addServerLinePacks } from "./server-lines.ts";

addServerLinePacks({ zh });
