// social-rules.ts — Per-platform username rules + social identity finder
// Each platform has strict rules. Agent must know them before attempting signup.

export interface PlatformRules {
  platform: string;
  label: string;
  min_length: number;
  max_length: number;
  allowed_chars: string;       // regex description
  allowed_pattern: RegExp;     // actual regex for validation
  case_sensitive: boolean;
  unique_across: string[];     // what this username conflicts with
  requires_verification: "email" | "email+sms" | "phone" | "none";
  signup_method: "api" | "playwright" | "both";
  captcha_risk: "none" | "low" | "medium" | "high";
  notes: string[];
}

export const PLATFORM_RULES: PlatformRules[] = [
  {
    platform: "instagram",
    label: "Instagram",
    min_length: 1,
    max_length: 30,
    allowed_chars: "lowercase letters, numbers, periods, underscores",
    allowed_pattern: /^[a-z0-9._]+$/,
    case_sensitive: false,
    unique_across: ["instagram"],
    requires_verification: "email+sms",
    signup_method: "playwright",
    captcha_risk: "high",
    notes: [
      "Periods (.) are allowed — user.name and username are different",
      "Underscores (_) are allowed",
      "No uppercase — always lowercase",
      "No hyphens",
      "Can change username once per 14 days",
      "Meta Business unlocks Facebook + WhatsApp",
    ],
  },
  {
    platform: "x",
    label: "X (Twitter)",
    min_length: 1,
    max_length: 15,
    allowed_chars: "letters, numbers, underscores",
    allowed_pattern: /^[a-zA-Z0-9_]+$/,
    case_sensitive: false,
    unique_across: ["x"],
    requires_verification: "email+sms",
    signup_method: "playwright",
    captcha_risk: "medium",
    notes: [
      "Underscores (_) are the only special char",
      "No periods, hyphens, or other symbols",
      "Max 15 chars — shorter is better",
      "Can change @handle anytime",
    ],
  },
  {
    platform: "tiktok",
    label: "TikTok",
    min_length: 2,
    max_length: 24,
    allowed_chars: "letters, numbers, underscores, periods",
    allowed_pattern: /^[a-zA-Z0-9._]+$/,
    case_sensitive: false,
    unique_across: ["tiktok"],
    requires_verification: "email+sms",
    signup_method: "playwright",
    captcha_risk: "high",
    notes: [
      "Periods (.) are allowed",
      "Underscores (_) are allowed",
      "Must be 2+ chars",
      "Complex captcha (puzzle/rotate/3D shapes)",
    ],
  },
  {
    platform: "youtube",
    label: "YouTube",
    min_length: 3,
    max_length: 30,
    allowed_chars: "letters, numbers, hyphens, underscores, periods",
    allowed_pattern: /^[a-zA-Z0-9._-]+$/,
    case_sensitive: false,
    unique_across: ["youtube"],
    requires_verification: "email+sms",
    signup_method: "playwright",
    captcha_risk: "medium",
    notes: [
      "Requires Google account first",
      "Channel name ≠ @handle — handle is separate",
      "Handle (@) must be 3-30 chars",
      "Periods and hyphens allowed in handle",
      "Can change handle 3 times per year",
    ],
  },
  {
    platform: "bluesky",
    label: "Bluesky",
    min_length: 3,
    max_length: 18,
    allowed_chars: "letters, numbers, hyphens",
    allowed_pattern: /^[a-zA-Z0-9-]+$/,
    case_sensitive: false,
    unique_across: ["bluesky"],
    requires_verification: "email",
    signup_method: "api",
    captcha_risk: "none",
    notes: [
      "No periods, underscores, or special chars",
      "Hyphens (-) are the only special char",
      "Must be 3-18 chars",
      "Handle becomes: username.bsky.social",
      "Can later migrate to custom domain handle",
      "FULL AUTO — direct API, no captcha",
    ],
  },
  {
    platform: "facebook",
    label: "Facebook",
    min_length: 5,
    max_length: 50,
    allowed_chars: "letters, numbers, periods",
    allowed_pattern: /^[a-zA-Z0-9.]+$/,
    case_sensitive: false,
    unique_across: ["facebook"],
    requires_verification: "email",
    signup_method: "api",
    captcha_risk: "medium",
    notes: [
      "Unlocked via Meta Business (Instagram bundle)",
      "Page name is separate from personal profile",
      "Periods (.) are allowed",
      "No hyphens or underscores in Page username",
    ],
  },
  {
    platform: "whatsapp",
    label: "WhatsApp Business",
    min_length: 1,
    max_length: 25,
    allowed_chars: "letters, numbers, spaces, hyphens, periods",
    allowed_pattern: /^[a-zA-Z0-9 .-]+$/,
    case_sensitive: false,
    unique_across: ["whatsapp"],
    requires_verification: "phone",
    signup_method: "api",
    captcha_risk: "low",
    notes: [
      "Requires phone number (Telnyx)",
      "Business name can have spaces",
      "Display name is public, phone is private",
      "Unlocked via Meta Business + phone",
    ],
  },
  {
    platform: "twitch",
    label: "Twitch",
    min_length: 4,
    max_length: 25,
    allowed_chars: "letters, numbers, underscores",
    allowed_pattern: /^[a-zA-Z0-9_]+$/,
    case_sensitive: false,
    unique_across: ["twitch"],
    requires_verification: "email",
    signup_method: "playwright",
    captcha_risk: "low",
    notes: [
      "No periods, hyphens, or special chars",
      "Underscores (_) are allowed",
      "Must be 4-25 chars",
    ],
  },
  {
    platform: "snapchat",
    label: "Snapchat",
    min_length: 3,
    max_length: 15,
    allowed_chars: "letters, numbers, underscores, hyphens",
    allowed_pattern: /^[a-zA-Z0-9_-]+$/,
    case_sensitive: false,
    unique_across: ["snapchat"],
    requires_verification: "email+sms",
    signup_method: "playwright",
    captcha_risk: "medium",
    notes: [
      "Hyphens and underscores allowed",
      "Must be 3-15 chars",
      "Username is case-insensitive",
    ],
  },
  {
    platform: "telegram",
    label: "Telegram",
    min_length: 5,
    max_length: 32,
    allowed_chars: "letters, numbers, underscores",
    allowed_pattern: /^[a-zA-Z0-9_]+$/,
    case_sensitive: false,
    unique_across: ["telegram"],
    requires_verification: "phone",
    signup_method: "api",
    captcha_risk: "low",
    notes: [
      "Requires phone number",
      "Username starts with @",
      "No periods or hyphens",
      "Must be 5+ chars",
    ],
  },
];

// ─── Validation ──────────────────────────────────────────────
export function validateHandle(handle: string, platform: string): { valid: boolean; reason?: string } {
  const rules = PLATFORM_RULES.find((r) => r.platform === platform);
  if (!rules) return { valid: false, reason: `unknown platform: ${platform}` };

  const h = rules.case_sensitive ? handle : handle.toLowerCase();

  if (h.length < rules.min_length) {
    return { valid: false, reason: `too short (min ${rules.min_length})` };
  }
  if (h.length > rules.max_length) {
    return { valid: false, reason: `too long (max ${rules.max_length})` };
  }
  if (!rules.allowed_pattern.test(h)) {
    return { valid: false, reason: `invalid chars — ${rules.allowed_chars}` };
  }

  return { valid: true };
}

// ─── Cross-platform compatibility check ──────────────────────
export function findUniversalHandle(handles: string[], platforms?: string[]): {
  handle: string;
  valid_on: string[];
  invalid_on: { platform: string; reason: string }[];
} {
  const targetPlatforms = platforms || PLATFORM_RULES.map((r) => r.platform);
  let bestHandle = handles[0] || "";
  let bestScore = -1;

  for (const handle of handles) {
    let score = 0;
    for (const platform of targetPlatforms) {
      const result = validateHandle(handle, platform);
      if (result.valid) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestHandle = handle;
    }
  }

  const valid_on: string[] = [];
  const invalid_on: { platform: string; reason: string }[] = [];

  for (const platform of targetPlatforms) {
    const result = validateHandle(bestHandle, platform);
    if (result.valid) valid_on.push(platform);
    else invalid_on.push({ platform, reason: result.reason || "invalid" });
  }

  return { handle: bestHandle, valid_on, invalid_on };
}

// ─── Handle variations generator ─────────────────────────────
export function generateVariants(base: string): string[] {
  const variants: string[] = [base];

  // Dot variations (for Instagram, TikTok, Facebook)
  if (base.length > 4) {
    const mid = Math.floor(base.length / 2);
    variants.push(base.slice(0, mid) + "." + base.slice(mid));
  }

  // Underscore variations (for X, Twitch, Snapchat)
  if (!base.includes("_") && base.length < 12) {
    variants.push(base + "_");
  }

  // Hyphen variations (for Bluesky)
  if (!base.includes("-") && base.length < 15) {
    variants.push(base.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase());
  }

  // Suffix variations
  for (const suffix of ["official", "art", "studio", "hq", "app"]) {
    if (!base.endsWith(suffix)) {
      variants.push(base + suffix);
    }
  }

  return [...new Set(variants)];
}
