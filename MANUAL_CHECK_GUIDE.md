# Manual Platform Check Instructions

## Why Manual?

These platforms block all automated access (server-side scraping, APIs, even Apify). The only reliable way to check is from a real browser.

## Instagram

1. Go to **instagram.com** and log in to any account (or create a throwaway)
2. Go to your profile → **Edit Profile**
3. Tap on **Username** field
4. Delete your current username and type `hamtask`
5. **DO NOT PRESS CONFIRM** — just type it and look:
   - If it shows ✅ or no error → **available**
   - If it shows ❌ "This username isn't available" → **taken**
6. Press Back/Cancel to leave without changing

**Important:** Pressing Confirm WILL change your username and lock it in. Only type it to check availability.

## Twitch

1. Go to **twitch.tv/hamtask**
2. If it shows "Sorry. Unless you've got a time machine..." → **available**
3. If it shows a channel page → **taken**

## Reddit

1. Go to **reddit.com/user/hamtask**
2. If it shows "Sorry, nobody on Reddit goes by that name" → **available**
3. If it shows a profile page → **taken**

## Facebook

1. Go to **facebook.com/hamtask**
2. If it shows "This page isn't available" → **available**
3. If it shows a profile/page → **taken**

## Threads

1. Go to **threads.net/@hamtask**
2. If it shows "Page not found" → **available**
3. If it shows a profile → **taken**

## Quick Check Script (Browser Console)

Paste this in browser console while on any page:

```javascript
// Check multiple platforms at once
const name = 'hamtask';
const platforms = [
  { name: 'Instagram', url: `https://www.instagram.com/${name}/` },
  { name: 'Twitch', url: `https://www.twitch.tv/${name}` },
  { name: 'Reddit', url: `https://www.reddit.com/user/${name}` },
  { name: 'Facebook', url: `https://www.facebook.com/${name}` },
  { name: 'Threads', url: `https://threads.net/@${name}` },
];
for (const p of platforms) {
  window.open(p.url, '_blank');
  console.log(`Open: ${p.name} → ${p.url}`);
}
```

This opens all5 in new tabs. Check each one manually.
