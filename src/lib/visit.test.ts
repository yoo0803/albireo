import { describe, expect, it } from "vitest";
import { BOT, cleanPath, deviceOf, refHost } from "./visit";

describe("visit", () => {
  it("기기 구분", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 15; SM-F956N) Chrome Safari")).toBe("tablet");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 15; SM-S928N) Chrome Mobile Safari")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome")).toBe("desktop");
  });
  it("유입 경로: 외부만", () => {
    const me = "https://albireo-orbit.vercel.app";
    expect(refHost("https://www.google.com/search?q=x", me)).toBe("google.com");
    expect(refHost("https://albireo-orbit.vercel.app/articles", me)).toBeNull();
    expect(refHost("android-app://com.slack", me)).toBeNull();
    expect(refHost("", me)).toBeNull();
  });
  it("경로 정리", () => {
    expect(cleanPath("/articles/a-b?x=1#h")).toBe("/articles/a-b");
    expect(cleanPath("//evil.com")).toBeNull();
    expect(cleanPath("https://x")).toBeNull();
    expect(cleanPath("/<script>")).toBeNull();
  });
  it("봇 제외", () => {
    expect(BOT.test("Googlebot/2.1")).toBe(true);
    expect(BOT.test("Mozilla/5.0 (Macintosh) Safari")).toBe(false);
  });
});
