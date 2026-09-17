# Postiz Integration Architecture — The Complete Vision

## Core Principle: Postiz as Executor, Not Trusted Kernel

```
AGENT
  │
  ▼
DESIRED OUTCOME ("post X to YouTube")
  │
  ▼
QP PREPARE
  exact payload + prerequisites + bounded authority
  │
  ▼
SOCIAL EXECUTOR (Postiz / direct APIs / other OSS)
  │
  ▼
PLATFORM (YouTube / Instagram / TikTok / X)
  │
  ▼
INDEPENDENT READBACK (Official API probe)
  │
  ▼
QP SETTLE → TRUE / FALSE / UNKNOWN
  │
  ▼
CANONICAL SOCIAL STATE
  │
  └──→ AGENT (analytics / feedback)
```

## The Separation

If Postiz says `{"success": true}`, that is merely evidence that Postiz believes its attempt succeeded. It is not the proof.

QP then asks YouTube independently:
- Does video ID abc123 actually exist on channel UCxxx?
- With media hash/content identity X?
- Title Y? Privacy state PUBLIC?

Only that readback settles the claim.

This lets you freely import unreliable third-party code without making it part of your trusted base.

## The Logical Endpoint

Originally: name → domain → email → phone → social accounts

With QP: identity → credentials → capabilities → effects → verified world-state → observations → feedback

An agent no longer receives:
```
YOUTUBE_ACCESS_TOKEN=...
TIKTOK_TOKEN=...
X_TOKEN=...
```

It receives capabilities:
```
social.youtube.channel[UC123].post_video
social.youtube.channel[UC123].read_analytics
social.tiktok.account[748...].post_video
social.instagram.account[...].publish_reel
```

The underlying secrets remain in the vault.

## The Final Primitive

```python
agent.social.execute(
    desired_state,
    authority
) -> QP receipt
```

Agents don't care whether execution went through Postiz, direct YouTube, n8n, a browser, or some future platform-native agent API. They ask for a state. QP proves whether that state became reality.

## What to Reuse from Postiz

| Component | Use it for | What QP adds |
|-----------|-----------|--------------|
| Postiz | Primary publishing adapter, scheduling, platform normalization, media upload, OAuth flows, analytics adapters | Never trust its success state; independently verify |
| Postiz Agent CLI | Ready-made agent interface to social executor | Put QP in front of its commands |
| Google API Node client | YouTube authoritative verifier + direct fallback executor | Pin exact API requests, turn responses into provenance-bearing QP evidence |
| OpenBao | Secret/OAuth credential vault | QP grants authority to use credential references; receipts never contain raw credentials |
| Nango | OAuth/token-refresh abstraction | QP proves oauth_authorized(...); Nango handles refresh lifecycle |
| Trigger.dev / Temporal | Durable retries, schedules, wait states | They execute workflows; QP decides what workflows are allowed to conclude |
| Mixpost | MIT-licensed alternative reference | Potential source for reusable provider patterns |

## YouTube Example

REQUEST:
```
artifact = sha256:VIDEO123
channel  = UCabc
title    = "QP demo"
privacy  = PUBLIC
```

QP checks:
```
account_owned(youtube, UCabc)        == TRUE
oauth_authorized(...youtube.upload)  == TRUE
media_artifact(VIDEO123)             == TRUE
```

Grant authorizes:
```
youtube.video.insert {
    artifact_hash: VIDEO123,
    channel: UCabc,
    title: "QP demo",
    privacy: PUBLIC
}
```

Postiz performs the upload. But QP does NOT settle from Postiz's return value.

QP independently runs Google's API:
```
youtube_video_created(video_id, channel_id)        → TRUE
youtube_video_metadata(video_id, metadata_hash)    → TRUE
youtube_video_privacy(video_id, PUBLIC)             → TRUE
youtube_video_processing(video_id, SUCCEEDED)       → TRUE
youtube_video_visible(video_id)                     → TRUE
```

Receipt:
```
requested:    { channel: UCabc, artifact: sha256:VIDEO123, title: "QP demo", visibility: PUBLIC }
executor:     postiz
release_id:   abc123
independent:  youtube.videos.list(abc123) + public readback + channel ownership
settled:      video_created=TRUE, channel_bound=TRUE, title_bound=TRUE, visibility_public=TRUE, processing_complete=TRUE
```

Agent gets: `PROVEN: https://youtube.com/watch?v=abc123`

Instead of: `Postiz returned HTTP 200 so probably yes.`

## Analytics as QP Surface

```typescript
analytics_snapshot {
    platform: youtube
    channel: UCabc
    query_hash: sha256(...)
    dimensions: [day, video]
    metrics: [views, likes, ...]
    period: [...]
    observed_at: ...
    source: YouTube Analytics API
    OAuth_principal: ...
    response_hash: ...
}
```

Then: `QP_PROVEN analytics_snapshot(...)`

## The RL/Experimental Loop

```
GENERATE → POST → QP proves POST EXISTS
  → YouTube observations → QP proves ANALYTICS SNAPSHOT
  → experiment evaluator → new hypothesis/content → POST
```

The loop cannot learn from:
- A post that never actually published
- Analytics from the wrong channel
- Analytics from the wrong video
- Stale observations
- A Postiz internal job that claimed success
- An OAuth credential tied to the wrong identity

## Simplified cmail Architecture

Don't build:
- Our own OAuth framework
- Our own scheduler
- Our own YouTube uploader
- Our own TikTok uploader
- Our own analytics framework
- Our own retry queue
- Our own platform-specific validators

Build the thing nobody else has:

```
QP SOCIAL KERNEL

setup_identity()        → prove_identity()
connect_capability()    → prove_capability()
authorize_effect()      → execute_via_adapter()
prove_external_effect()
observe_metric()        → prove_observation()
replay_everything()
```

Everything underneath is replaceable.

## The Bottom Line

This is a substantially stronger endpoint than paying $29/month for Postiz hosted. The value isn't the scheduling algorithm — it's the QP proof layer that makes autonomous agent actions verifiable.
