import { describe, expect, it } from "vitest";
import { verifyDomain, checkHandles, checkAvailability, structuralScore, vanScore, rulesHash, wilsonLower, bulkCheck } from "./names";

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

describe("beast mode scoring (steals domainarena structural formula)", () => {
  it("scores pronounceable short names higher", () => {
    expect(structuralScore("malorie")).toBeGreaterThan(structuralScore("xqztkvr"));
    expect(structuralScore("malorie")).toBeLessThanOrEqual(1);
    expect(structuralScore("malorie")).toBeGreaterThanOrEqual(0);
  });
  it("van test rewards short alpha names", () => {
    expect(vanScore("malorie")).toBe(1.0);
    expect(vanScore("malorie-smith")).toBeLessThan(vanScore("malorie"));
    expect(vanScore("xqzt")).toBeLessThan(vanScore("malorie"));
  });
  it("rules hash is stable and order-independent for tlds", () => {
    const a = rulesHash({ tlds: ["co.uk", "com"] });
    const b = rulesHash({ tlds: ["com", "co.uk"] });
    expect(a).toBe(b);
    expect(rulesHash({ max_len: 8 })).not.toBe(rulesHash({ max_len: 12 }));
  });
  it("wilson lower bound is conservative on thin data", () => {
    expect(wilsonLower(0, 0)).toBe(0);
    expect(wilsonLower(1, 1)).toBeLessThan(1);
    expect(wilsonLower(90, 100)).toBeGreaterThan(wilsonLower(9, 10));
  });
  it("bulkCheck runs live on 2 names", async () => {
    const report = await bulkCheck(["malorie", "xqztkvr999"], { tlds: ["co.uk"] });
    expect(report.checked).toBe(2);
    expect(report.rules_hash).toMatch(/^rules_[0-9a-f]{8}$/);
    expect(report.hits.every(h => typeof h.combined === "number")).toBe(true);
    expect(typeof report.hit_rate).toBe("number");
  }, 30000);
  it("never reports available on DNS alone without RDAP", async () => {
    // Regression: christina.co.uk + marlyn.co.uk NXDOMAIN yet registrar-taken.
    for (const d of ["christina.co.uk", "marlyn.co.uk"]) {
      const r = await verifyDomain(d);
      expect(r.registration.status).not.toBe("available");
    }
  }, 30000);
  it("verifier promotes unknowns and demotes mirages", async () => {
    const verify = async (d: string) => d === "maybefree.co.uk";
    const report = await bulkCheck(["maybefree", "mirage"], { tlds: ["co.uk"] }, { verify });
    const domains = report.hits.map(h => h.domain);
    expect(domains).toContain("maybefree.co.uk");
    expect(domains).not.toContain("mirage.co.uk");
    expect(report.summary.taken).toBe(1);
  }, 30000);
  it("verify_hits:false skips the verifier", async () => {
    let calls = 0;
    const report = await bulkCheck(["malorie"], { tlds: ["co.uk"], verify_hits: false }, {
      verify: async () => { calls++; return true; },
    });
    expect(calls).toBe(0);
    expect(report.checked).toBe(1);
  }, 30000);
});
