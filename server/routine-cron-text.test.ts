import { describe, expect, it } from "vitest";

import { cronScheduleLabel } from "../shared/cron-label.ts";
import { routineCronText } from "./routine-cron-text.ts";
import "./server-line-packs.ts";

const expressions = [
  "0 9 * * *", "30 18 L * *", "5 0 14 * *", "15 8 25 12 *", "0 9 * * 1-5", "0 9 * * MON-FRI", "*/5 * * * *",
  ...Array.from({ length: 8 }, (_, day) => `0 9 * * ${day}`),
  ...[1, 2, 3, 4, 5, "L"].flatMap((nth) => Array.from({ length: 8 }, (_, day) => `0 9 * * ${day}#${nth}`)),
];

describe("cron words on a routine request", () => {
  it.each(expressions)("preserves the English label for %s", (expression) => {
    const schedule = { type: "cron" as const, expression, timeZone: "America/New_York" };
    expect(routineCronText(schedule)).toBe(cronScheduleLabel(schedule));
    expect(routineCronText(schedule, "en")).toBe(cronScheduleLabel(schedule));
    expect(routineCronText(schedule, "en-GB")).toBe(cronScheduleLabel(schedule));
  });

  it.each([
    ["0 9 * * *", "每天 09:00"],
    ["0 9 L * *", "每月最后一天 09:00"],
    ["0 9 14 * *", "每月 14 日 09:00"],
    ["0 9 25 12 *", "每年十二月25日 09:00"],
    ["0 9 * * 1-5", "每个工作日 09:00"],
    ["0 9 * * 1", "每个星期一 09:00"],
    ["0 9 * * 0", "每个星期日 09:00"],
    ["0 9 * * 1#2", "每月第二个星期一 09:00"],
    ["0 9 * * 6#L", "每月最后一个星期六 09:00"],
    ["*/5 * * * *", "Cron 表达式 */5 * * * *"],
  ])("localizes %s without changing its expression or time zone", (expression, text) => {
    const schedule = { type: "cron" as const, expression, timeZone: "UTC" };
    expect(routineCronText(schedule, "zh")).toBe(`${text} UTC`);
    expect(schedule.expression).toBe(expression);
  });

  it.each(["0 9 * * 1-5", "0 9 * * MON-FRI"])("names weekdays in Chinese for %s", (expression) => {
    const schedule = { type: "cron" as const, expression, timeZone: "UTC" };
    expect(routineCronText(schedule, "zh")).toBe("每个工作日 09:00 UTC");
  });

  it("has Chinese words and falls back to complete English for an untranslated language", () => {
    const schedule = { type: "cron" as const, expression: "0 9 * * 1", timeZone: "UTC" };
    expect(routineCronText(schedule, "zh")).toBe("每个星期一 09:00 UTC");
    expect(routineCronText(schedule, "fr")).toBe("Weekly on Monday at 9:00 UTC");
  });

  it("uses Simplified Chinese weekday names for zh-TW", () => {
    const schedule = { type: "cron" as const, expression: "0 9 * * 1", timeZone: "UTC" };
    expect(routineCronText(schedule, "zh-tw")).toContain("星期一");
    const yearly = routineCronText({ type: "cron" as const, expression: "0 9 1 3 *", timeZone: "UTC" }, "zh-tw");
    expect(yearly).toContain("三月");
    expect(yearly).not.toContain("March");
  });
});
