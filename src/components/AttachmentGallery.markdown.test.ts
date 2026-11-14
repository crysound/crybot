import { expect, it } from "vitest";
import { messageFileTargets } from "../../server/message-file";
import { collectMessageFiles } from "./AttachmentGallery";

it.each([
  ["parentheses", "[report](./report(final).pdf)", ["./report(final).pdf"]],
  ["escaped parentheses", String.raw`[report](./report\(final\).pdf)`, ["./report(final).pdf"]],
  ["escaped punctuation", String.raw`[report](./report\_final.pdf)`, ["./report_final.pdf"]],
  ["autolink", "<file:///workspace/report.pdf>", ["file:///workspace/report.pdf"]],
  ["full reference", "[report][REPORT]\n\n[report]: ./report.pdf", ["./report.pdf"]],
  ["collapsed reference", "[report][]\n\n[report]: ./report.pdf", ["./report.pdf"]],
  ["shortcut reference", "[report]\n\n[report]: ./report.pdf", ["./report.pdf"]],
  ["reference whitespace", "[report][a  b]\n\n[a b]: ./report.pdf", ["./report.pdf"]],
  ["nested brackets", "[report [final]](./report.pdf)", ["./report.pdf"]],
  ["indented code", "    [report](./report.pdf)", []],
  ["HTML comment", "<!-- [report](./report.pdf) -->", []],
  ["escaped brackets", String.raw`\[report](./report.pdf)`, []],
  ["Windows separators", String.raw`[report](C:\Users\me\.crybot\report.pdf)`, [String.raw`C:\Users\me\.crybot\report.pdf`]],
  ["Windows reference", String.raw`[report]

[report]: C:\Users\me\_reports\report.pdf`, [String.raw`C:\Users\me\_reports\report.pdf`]],
  ["fenced code", "```md\n[report](./report.pdf)\n```", []],
])("matches server authorization with windowsPathDestinations: %s", (_name, markdown, expected) => {
  const authorized = messageFileTargets(markdown as string);
  expect(authorized).toEqual(expected);
  expect(collectMessageFiles(markdown as string).map((file) => file.path)).toEqual(authorized);
});
