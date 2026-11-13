import { describe, expect, it } from "vitest";
import { safePath } from "./safe-path";

describe("safePath", () => {
  it("내부 경로 허용", () => expect(safePath("/studio/canvas")).toBe("/studio/canvas"));
  it("외부 · 프로토콜 상대 · 백슬래시 차단", () => {
    expect(safePath("https://evil.com")).toBe("/studio");
    expect(safePath("//evil.com")).toBe("/studio");
    expect(safePath("/\\evil.com")).toBe("/studio");
    expect(safePath(null)).toBe("/studio");
  });
});
