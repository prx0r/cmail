# Reference blueprint for other business types

Use these as priors, not immutable answers.

| Business | likely public primary | common secondary | why |
|---|---|---|---|
| plumber / electrician / locksmith | local 01/02 | 07 SMS | locality strongly affects purchase; mobile handles messaging |
| dental practice / clinic | local 01/02 | 07 if SMS needed | premises/location is core |
| local garage | local 01/02 | 07 SMS | location and trust |
| restaurant | local 01/02 | 07 if operational SMS needed | premises-bound |
| estate agent branch | local 01/02 per branch | national HQ optional | branch geography is meaningful |
| solicitor with one local office | local 01/02 or 03 | 07 SMS | depends whether practice sells local presence or specialist national expertise |
| specialist law firm serving UK | 03 | 07 SMS | expertise, not locality |
| ecommerce | 03 | 07 SMS | national customer base |
| SaaS | 03 or no public PSTN initially | 07 if SMS workflow requires | locality irrelevant |
| remote consultancy | 03 | 07 if SMS | UK-wide identity |
| marketplace / aggregator | 03 | 07 SMS | national coordination layer |
| national home-services dispatcher | 03 | 07 SMS | do not pretend HQ area is service geography |
| high-ticket national sales line | 0800/0808 or 03 | 07 SMS | compare free-caller conversion value vs economics |
| support helpline | 0800/0808 | 07 SMS | caller friction is meaningful |
| creator/personal brand | 07 may be acceptable | — | intentionally personal/mobile identity |
| field sales rep | 07 | — | direct mobile identity can be desirable |
| franchise | national HQ 03 + local branch 01/02 | 07 where messaging needed | layered identity |
| multi-location clinic | per-location 01/02 + central 03 | 07 messaging | both local discovery and central routing matter |
| tradesperson planning national platform | show local+03 trade-off | 07 SMS | distinguish current service footprint from intended brand semantics |

## Inference tests

Ask:

1. If the company moved headquarters tomorrow, should the public number still make sense?
   - yes -> national/mobile/toll-free gains weight
   - no, customers visit/call because of this location -> local gains weight

2. Would a customer search "near me" for this service?
   - often -> local gains weight
   - rarely -> national gains weight

3. Is a free call plausibly worth more than the incremental inbound cost?
   - yes -> toll-free gains weight

4. Does SMS have to originate/terminate on the same DID?
   - yes -> current Telnyx GB constraint may force mobile
   - no -> split public voice identity from messaging

5. Is the founder asking for local merely because that is where they currently live?
   - do not treat this as enough evidence for local branding

6. Is the founder asking for London because it "looks bigger"?
   - reject misleading locality; offer 03 instead

7. Is there an existing number customers already know?
   - stop new-number optimisation and evaluate porting first

