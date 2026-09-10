import { describe, expect, it } from "vitest";
import { verifyDomain, checkHandles, checkAvailability } from "./names";

describe("verifyDomain", () => {
  it("detects taken .com domain", async () => {
    const r = await verifyDomain("google.com");
    expect(r.registration.status).toBe("taken");
    expect(r.registration.confidence).toBe("high");
    expect(r.domain).toBe("google.com");
  }, 10000);

  it("detects available obscure domain", async () => {
    const r = await verifyDomain("xyzzy998877zzzxyz.trade");
    expect(r.registration.status).toBe("available");
  }, 10000);

  it("returns buy_url", async () => {
    const r = await verifyDomain("test.com");
    expect(r.buy_url).toContain("cloudflare.com");
  }, 10000);
});

describe("checkHandles", () => {
  it("returns results for github", async () => {
    const results = await checkHandles("postagi");
    expect(results.length).toBeGreaterThan(0);
    const gh = results.find(h => h.platform === "github");
    expect(gh).toBeDefined();
    expect(["taken", "available", "unknown"]).toContain(gh!.status);
  }, 15000);

  it("returns results for npm", async () => {
    const results = await checkHandles("postagi");
    const npm = results.find(h => h.platform === "npm");
    expect(npm).toBeDefined();
    expect(["taken", "available", "unknown"]).toContain(npm!.status);
  }, 15000);
});

describe("checkAvailability", () => {
  it("returns unified report", async () => {
    const report = await checkAvailability("postagi", ["com", "io"]);
    expect(report.name).toBe("postagi");
    expect(report.domains.length).toBe(2);
    expect(report.handles.length).toBeGreaterThan(0);
    expect(report.summary.domains_total).toBe(2);
    expect(report.timestamp).toBeDefined();
  }, 20000);
});
