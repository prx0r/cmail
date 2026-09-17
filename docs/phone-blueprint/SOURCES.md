# Sources and provenance

Research date: 2026-09-11.

Official sources reviewed:
- Telnyx Number Search — https://developers.telnyx.com/docs/numbers/phone-numbers/number-search
- Telnyx Number Reservations — https://developers.telnyx.com/docs/numbers/phone-numbers/number-reservations
- Telnyx UK DID Requirements — https://support.telnyx.com/en/articles/1311457-united-kingdom-uk-did-requirements
- Telnyx Find GB Numbers — https://support.telnyx.com/en/articles/5820047-find-gb-numbers-on-telnyx-portal
- Telnyx UK SMS Guidelines — https://support.telnyx.com/en/articles/6531704-united-kingdom-sms-guidelines
- Telnyx Requirement Groups — https://support.telnyx.com/en/articles/9801714-requirement-groups-for-ordering-phone-numbers
- Telnyx UK Number Porting — https://support.telnyx.com/en/articles/3267693-united-kingdom-number-porting
- Telnyx official AI repository — https://github.com/team-telnyx/ai
- Telnyx official Knowledge Base repository — https://github.com/team-telnyx/knowledge-base
- Telnyx code examples — https://github.com/team-telnyx/telnyx-code-examples
- prx0r/cmail — https://github.com/prx0r/cmail

Relevant `cmail` files reviewed:
- README.md
- AGENTS.md
- stevejobless/SKILL.md
- stevejobless/NORTHSTAR.md
- docs/GUIDE.md

Notes:
- The runtime used to build this archive did not have outbound DNS for `git clone`, so official repositories were inspected through the connected GitHub integration and current public Telnyx documentation instead of being vendored into this ZIP.
- This ZIP deliberately does not redistribute Telnyx's full documentation corpus. It contains a derived implementation rubric and links back to canonical sources.
- Provider rules, inventory and prices are dynamic. Production code should recheck current provider data at execution time.
