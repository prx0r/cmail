# Spending Confirmation Primitive

## Problem
LLM agents can accidentally (or maliciously) spend money without explicit human consent.

## Solution: Matching Text Confirmation
Require the agent to type the exact action text to confirm spending.

```typescript
// Before: agent can accidentally buy
if (args.confirmed) { purchase(domain); }

// After: agent must type exact text
if (args.confirmed && args.confirm_text === `BUY ${domain}`) {
  purchase(domain);
}
```

## Why It Works

1. **Exact match required** — Agent can't cheat with variations
2. **No crypto needed** — Simple string comparison
3. **Prompt injection resistant** — Attacker must know exact domain name
4. **Human readable** — `confirm_text: "BUY postagi.trade"` is clear
5. **Audit trail** — Logged what was confirmed

## Comparison to Existing Approaches

| Approach | Our Primitive | ADK Confirmation | ERC-8004 | AP2 |
|----------|--------------|------------------|----------|-----|
| Complexity | Low | Medium | High | High |
| Crypto required | No | No | Yes | Yes |
| Works with any agent | Yes | Yes | No | No |
| Prevents accidental | Yes | Yes | Yes | Yes |
| Prevents injection | Yes (exact match) | Partial | Yes | Yes |

## Usage

```typescript
// Tool definition
{
  name: "cf_purchase_domain",
  inputSchema: {
    domain: "string",
    confirmed: "boolean",
    confirm_text: "string" // Must be "BUY {domain}"
  }
}

// Handler
if (!args.confirmed) return preview;
if (args.confirm_text !== `BUY ${args.domain}`) {
  return { error: "confirm_text required", expected: `BUY ${args.domain}` };
}
// Only now execute the purchase
```

## Other Applications
- Domain registration
- Email sending (confirm_text: "SEND to {email}")
- Phone number purchase
- Any irreversible action
