import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnimatedMascot } from "@/components/AnimatedMascot";
import { MASCOT_BODIES } from "../../shared/mascot-bodies";
import { steelBodyImage, type SteelImage } from "./steel-body";

const images: SteelImage[] = [40, 56, 88, 128, 192, 256].map((px) => ({ body: "dome", px, url: `/steel/dome-${px}.webp` }));

describe("CryBot's rendered steel body", () => {
  it("picks the smallest image with a device pixel for every pixel drawn, from the popup down to the dome", () => {
    expect(steelBodyImage("dome", 20, 2, images)).toBe("/steel/dome-40.webp");
    expect(steelBodyImage("dome", 28, 2, images)).toBe("/steel/dome-56.webp");
    expect(steelBodyImage("dome", 44, 1, images)).toBe("/steel/dome-56.webp");
    expect(steelBodyImage("dome", 96, 2, images)).toBe("/steel/dome-192.webp");
    expect(steelBodyImage("dome", 112, 3, images)).toBe("/steel/dome-256.webp");
    expect(steelBodyImage("dome", 28, 0, images)).toBe("/steel/dome-40.webp");
  });

  it("keeps the drawn steel for a body with no images", () => {
    expect(steelBodyImage("circle", 44, 2, images)).toBeNull();
    expect(steelBodyImage("dome", 44, 2, [])).toBeNull();
  });

  it("draws the picture over the whole avatar frame instead of the body and the face", () => {
    const svg = (picture?: string) => renderToStaticMarkup(createElement(AnimatedMascot, { size: 112, silhouette: MASCOT_BODIES.dome, picture }));
    const withPicture = svg("/steel/dome-256.webp");
    expect(withPicture).toContain('<image href="/steel/dome-256.webp" x="-15" y="-15" width="258.541" height="258.541" preserveAspectRatio="none"');
    expect(withPicture).not.toMatch(/fill="url\(#[^)]+-grad\)"/);
    expect(withPicture).toMatch(/<g clip-path="url\(#[^)]+-clip\)" visibility="hidden">/);
    expect(svg()).toMatch(/fill="url\(#[^)]+-grad\)"/);
    expect(svg()).not.toContain("<image");
    expect(svg()).not.toContain('visibility="hidden"');
  });
});
