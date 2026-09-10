# Social Platform Endpoints — Canonical Reference

## Primary + Backup for Each Platform

### Direct (FREE)

| Platform | Primary Endpoint | Backup | Status Code Logic |
|----------|-----------------|--------|-------------------|
| **GitHub** | `GET https://api.github.com/users/{name}` | `GET https://github.com/{name}` | 200=taken, 404=available |
| **X** | `GET https://x.com/{name}` | — | 404=available, body `"This account doesn't exist"`=available |
| **YouTube** | `GET https://www.youtube.com/@{name}` | — | 404=available, body `"channelId":"UC"`=taken |
| **TikTok** | `GET https://www.tiktok.com/@{name}` | — | Body `"not found"`=available, `"uniqueId":"{name}"`=taken |
| **npm** | `GET https://registry.npmjs.org/{name}` | — | 200=taken, 404=available |
| **PyPI** | `GET https://pypi.org/pypi/{name}/json` | — | 200=taken, 404=available |
| **crates.io** | `GET https://crates.io/api/v1/crates/{name}` | — | 200=taken, 404=available |

### Apify ($0.006/handle)

| Platform | Actor | Endpoint | Status Field |
|----------|-------|----------|-------------|
| **Snapchat** | `corent1robert~social-handle-checker` | Apify API | `available_snapchat: yes/no/error` |
| **Bluesky** | `corent1robert~social-handle-checker` | Apify API | `available_bluesky: yes/no/error` |
| **Telegram** | `corent1robert~social-handle-checker` | Apify API | `available_telegram: yes/no/error` |
| **GitLab** | `corent1robert~social-handle-checker` | Apify API | `available_gitlab: yes/no/error` |
| **SoundCloud** | `corent1robert~social-handle-checker` | Apify API | `available_soundcloud: yes/no/error` |
| **Pinterest** | `corent1robert~social-handle-checker` | Apify API | `available_pinterest: yes/no/error` |

### Blocked (no solution)

| Platform | Why | Manual Check |
|----------|-----|-------------|
| **Instagram** | Meta blocks all automated access | `instagram.com/{name}` |
| **Facebook** | Meta blocks all | `facebook.com/{name}` |
| **Threads** | Meta blocks all | `threads.net/@{name}` |
| **Reddit** | Blocks anonymous (needs OAuth) | `reddit.com/user/{name}` |
| **Twitch** | JS-rendered, unreliable | `twitch.tv/{name}` |

## Apify Actor Details

**Actor:** `corent1robert~social-handle-checker`
**Input:** `{ "handles": ["name1", "name2"], "coverage": "all" }`
**Output fields per handle:**
```
available_instagram, available_tiktok, available_facebook, available_pinterest,
available_youtube, available_twitter, available_threads, available_github,
available_snapchat, available_twitch, available_reddit, available_bluesky,
available_telegram, available_gitlab, available_soundcloud
```
**Values:** `yes` / `no` / `error`
**Confidence:** `confidence_{platform}: high/low`

## Cost

| Approach | Platforms | Cost per 100 names |
|----------|-----------|-------------------|
| Direct (GitHub, X, YouTube, TikTok, npm, PyPI, crates) | 7 | **$0** |
| Apify (Snapchat, Bluesky, Telegram, GitLab, SoundCloud, Pinterest) | 6 | **$3.60** |
| Blocked (Instagram, Facebook, Threads, Reddit, Twitch) | 5 | N/A |
| **Total** | **13 working + 5 blocked** | **$3.60/100 names** |

## Implementation Order

1. **Direct checks first** (free, fast)
2. **Apify batch** (all 6 in one run, cheaper than individual)
3. **Merge results** (custom takes priority, Apify fills gaps)
4. **Report blocked** (Instagram et al = `unknown` with manual link)
