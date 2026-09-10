import { describe, expect, it } from "vitest";
import { canDo, normalizeClassification, routeAddress, threadId } from "./lib";

describe("routeAddress", () => {
  it("splits normal addresses", () => {
    expect(routeAddress("Support@Feedify.dev")).toEqual({ domain: "feedify.dev", localPart: "support" });
  });
  it("uses last @ on malformed input", () => {
    expect(routeAddress("a@b@c").domain).toBe("c");
  });
  it("never returns empty parts", () => {
    expect(routeAddress("not-an-email")).toEqual({ domain: "unknown", localPart: "not-an-email" });
    expect(routeAddress("@x.com").localPart).toBe("misc");
  });
});

describe("threadId", () => {
  it("strips stacked prefixes", () => {
    expect(threadId("Re: RE: Fwd: hello")).toBe("hello");
  });
  it("falls back to misc", () => {
    expect(threadId("")).toBe("misc");
    expect(threadId("Re: ")).toBe("misc");
  });
});

describe("canDo", () => {
  it("ADMIN implies everything", () => {
    expect(canDo(["ADMIN"], "FINANCIAL_ACTION")).toBe(true);
  });
  it("denies missing grants", () => {
    expect(canDo(["READ", "DRAFT"], "SEND")).toBe(false);
    expect(canDo(["READ", "DRAFT"], "DRAFT")).toBe(true);
  });
});

describe("normalizeClassification", () => {
  it("coerces hostile AI output to safe types", () => {
    const c = normalizeClassification(
      { classification: "DROP TABLE", importance: 99, needs_reply: "0", summary: "x".repeat(9000) }, "fb");
    expect(c).toEqual({ classification: "fyi", importance: 10, needs_reply: 0, summary: "x".repeat(500) });
  });
  it("accepts truthy variants", () => {
    expect(normalizeClassification({ needs_reply: true }, "s").needs_reply).toBe(1);
    expect(normalizeClassification({ needs_reply: "1" }, "s").needs_reply).toBe(1);
    expect(normalizeClassification({}, "s")).toEqual({ classification: "fyi", importance: 0, needs_reply: 0, summary: "s" });
  });
  it("lifts importance when reply needed but scored 0", () => {
    expect(normalizeClassification({ needs_reply: 1, importance: 0 }, "s").importance).toBe(5);
  });
});
