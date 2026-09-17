import { describe, expect, it } from "vitest";
import {
  memorabilityScore,
  spokenScore,
  recommendArchitecture,
  recommendPhoneIdentity,
} from "./phoneIdentity";

// Ported from uk-business-phone-agent-blueprint/tests/test_rubric.py.
// TS port must agree with the Python baseline on every case below.

describe("phoneIdentity parity with Python blueprint", () => {
  it("pattern beats random", () => {
    expect(memorabilityScore("+44330112244")).toBeGreaterThan(
      memorabilityScore("+44330583719")
    );
  });

  it("local trade with SMS splits channels", () => {
    const r = recommendArchitecture({
      locality_is_purchase_signal: 0.95,
      national_identity_value: 0.3,
      expected_expansion: 0.2,
      trust_sensitivity: 0.9,
      sms_required: true,
      same_number_sms_required: false,
    });
    expect(r.primary).toBe("local");
    expect(r.secondary).toBe("mobile");
  });

  it("same-number SMS pushes mobile", () => {
    const r = recommendArchitecture({
      locality_is_purchase_signal: 0.9,
      national_identity_value: 0.2,
      expected_expansion: 0.2,
      trust_sensitivity: 0.8,
      sms_required: true,
      same_number_sms_required: true,
    });
    expect(r.primary).toBe("mobile");
  });

  it("national brand prefers national", () => {
    const r = recommendArchitecture({
      locality_is_purchase_signal: 0.05,
      national_identity_value: 0.95,
      expected_expansion: 0.95,
      trust_sensitivity: 0.7,
      sms_required: true,
    });
    expect(r.primary).toBe("national");
  });

  it("spoken score rewards chunkable numbers", () => {
    expect(spokenScore("+44330112244")).toBeGreaterThan(spokenScore("+44330583719"));
  });

  it("recommendPhoneIdentity returns diverse top-3, never purchases", async () => {
    const seen: string[] = [];
    const r = await recommendPhoneIdentity(
      { locality_is_purchase_signal: 0.1, national_identity_value: 0.9, expected_expansion: 0.9, sms_required: true },
      async (strategy) => {
        seen.push(strategy);
        return [
          { number: "+44330112244", features: [{ name: "voice" }], monthly_cost: 2 },
          { number: "+447700900111", features: [{ name: "sms" }, { name: "voice" }], monthly_cost: 3 },
        ];
      }
    );
    expect(r.requires_confirmation).toBe(true);
    expect(r.options.length).toBeLessThanOrEqual(3);
    expect(seen).toContain("national");
    expect(seen).toContain("mobile");
    // No purchase/order/reserve keys anywhere in the result.
    expect(JSON.stringify(r)).not.toMatch(/purchase|order|reserve|buy/i);
  });
});
