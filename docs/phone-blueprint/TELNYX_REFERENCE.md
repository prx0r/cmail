# Telnyx reference for the UK phone-identity agent

This is a distilled operational reference, not a mirror of Telnyx documentation.

## Official material reviewed

### Telnyx developer documentation
- Number Search: `https://developers.telnyx.com/docs/numbers/phone-numbers/number-search`
- Number Reservations: `https://developers.telnyx.com/docs/numbers/phone-numbers/number-reservations`
- Telnyx documentation index: `https://developers.telnyx.com/llms.txt`

### Telnyx official GitHub
- `team-telnyx/ai`
  - `skills/telnyx-numbers-python/SKILL.md`
  - `skills/telnyx-numbers-python/references/api-details.md`
- `team-telnyx/knowledge-base`
  - UK DID requirements
  - Find GB Numbers on Telnyx Portal
  - UK SMS guidelines
- `team-telnyx/telnyx-code-examples`

### Current UK support guidance
- UK DID requirements
- GB number search guidance
- UK number porting
- UK SMS guidance
- Requirement Groups

## Search API

Core endpoint represented by current SDK docs:
`GET /v2/available_phone_numbers` (SDK skill shows `/available_phone_numbers` under v2 client).

Country code is required.

Important search filters documented by Telnyx:

| purpose | filter |
|---|---|
| country | `filter[country_code]` |
| capability | `filter[features]` |
| number type | `filter[phone_number_type]` |
| area code | `filter[national_destination_code]` |
| city/region | `filter[locality]` |
| state/province | `filter[administrative_area]` (US/CA only) |
| digit prefix | `filter[starts_with]` |
| digit suffix | `filter[ends_with]` |
| digit containment | `filter[contains]` |
| consecutive block | `filter[consecutive]` |
| result count | `filter[limit]` |
| reservable | `filter[reservable]` |
| exclude held | `filter[exclude_held_numbers]` |
| only held/reserved | `filter[only_reserved_numbers]` |

Telnyx explicitly documents:
- no wildcard characters in these search filters;
- numbers must be returned in a recent search before ordering;
- use `cost_information` to inspect price;
- inventory coverage can help determine valid area/city filter values;
- use `features=sms` when SMS capability is required;
- `best_effort` is documented as US/CA only;
- `quickship` is documented as US toll-free only.

Do not apply US/CA-only features as UK strategy knobs.

## Search response fields useful to this rubric

From the official generated Telnyx AI skill:
- `phone_number`
- `record_type`
- `quickship`
- `reservable`
- `best_effort`
- `cost_information`
- `features`
- `region_information`
- `vanity_format`

Treat provider response as source of truth.

## UK capability constraint

Current Telnyx GB portal guidance says:

**GB local, national and toll-free numbers are not SMS supported; only mobile numbers support SMS.**

This has a major architectural consequence:

A business may need:
- primary public voice identity: local / national / toll-free
- secondary mobile identity: SMS

Do not penalize a two-number configuration merely because it is not "one number everywhere"; channel correctness is more important.

## UK regulatory preflight

Current Telnyx UK DID guidance (May 2026) lists, for business identity:
- authorized representative name;
- company name;
- contact phone;
- company website;
- local company registration certificate;
- business use case.

Address verification:
- UK address;
- utility bill less than 3 months old.

The same current article states that end users must be physically present in-country when purchasing numbers from that country.

Toll-free/mobile business-use-case data should indicate sub-allocation if applicable.

The article notes approximately 72 hours to validate documentation and activate toll-free/mobile numbers after documentation receipt.

Provider rules can change. Store a `verified_at` date and recheck before live purchase.

## Requirement Groups

Telnyx Requirement Groups are reusable for a particular:
- country;
- phone-number type;
- order type.

A UK mobile ordering requirement group cannot simply be reused for a UK local order.

Recommended agent behavior:
1. identify intended number type;
2. find/create matching requirement group;
3. populate requirements;
4. submit;
5. associate it with the order;
6. track order requirements/status.

## Reservations

Telnyx's Number Reservations API:
- reserves eligible numbers for 30 minutes;
- gives exclusive search/order rights during that period;
- not all numbers are reservable;
- use `filter[reservable]=true` and `filter[exclude_held_numbers]=true` when searching if reservation is part of the intended flow.

Use reservations narrowly: top candidate(s), active human decision, short approval window.

Official generated skill:
- `POST /number_reservations`
- retrieve reservation;
- extend reservation action is available in the SDK.

## Ordering

Official generated Python skill:
- `client.number_orders.create(...)`
- REST operation: `POST /number_orders`
- required `phone_numbers`
- optional `connection_id`
- optional `messaging_profile_id`
- optional `billing_group_id`
- optional `customer_reference`

Useful response fields:
- id
- status
- requirements_met
- phone_numbers_count
- connection_id
- messaging_profile_id

Status can be tracked with retrieval and `number.order.status.update` webhooks.

## Wiring

A purchased DID is not useful until connected.

For `cmail/stevejobless`, preserve the existing pattern:
- number acquisition is identity/provisioning;
- `connection_id` attaches voice routing;
- `messaging_profile_id` attaches messaging where applicable;
- downstream voice/SIP agent wiring should be independently verified.

## Porting

UK Telnyx support guidance distinguishes local, national/toll-free and mobile port requirements. Porting an existing business number is a different workflow from new-number search and should not be treated as a vanity-number replacement decision.

## Messaging

Current UK SMS support article also documents alphanumeric sender IDs, subject to anti-fraud/registry rules for protected sender IDs.

Do not infer that having a mobile DID automatically solves WhatsApp Business registration, OTP deliverability or every sender-ID use case. Those are separate channel-specific workflows.

## Error handling

Official generated skill calls out:
- 401 authentication;
- 403 permissions;
- 404 missing resource;
- 422 validation;
- 429 rate limiting;
- network errors.

Agent behavior:
- retry only retryable failures;
- honour Retry-After where applicable;
- never reinterpret 422 as "probably bought";
- persist order IDs and receipts before continuing;
- idempotency should be added around spend paths.

