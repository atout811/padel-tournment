# Triple Helix Product Framework

This app is not only a tournament tracker. The product goal is to become the weekly padel habit for friend groups, youth communities, and small clubs.

Use this framework before building new features. Every meaningful feature should map to at least one helix pillar and one user intent.

## The Three Helix Pillars

### 1. Players And Friends

Primary question: does this make the weekly game more fun for the people playing?

This pillar covers rivalry, fairness, identity, progress, social proof, and the feeling that every friend has a story in the group.

Examples:

- Friend/player cards.
- Weekly rankings.
- Win streaks and form.
- Best partner and toughest opponent.
- Achievements.
- Shareable results.

### 2. Organizers And Clubs

Primary question: does this make running the night easier and reduce arguments?

This pillar covers setup speed, attendance, team generation, court assignment, scoring, result correction, and owner/admin controls.

Examples:

- Start tonight's games.
- Attendance selection.
- Guest handling.
- Court count and active court scheduling.
- Smart team balancing.
- Reopen/edit result flows.
- Admin or organizer roles.

### 3. Community And Growth

Primary question: does this help the group grow or make the app spread naturally?

This pillar covers invite loops, public pages, QR sharing, social sharing, season stories, and discoverability.

Examples:

- Group invite links.
- Public group preview.
- QR join flow.
- WhatsApp-friendly result cards.
- Season leaderboard.
- Public champion/history pages.

## Core Intents

These are the product intents the app should optimize around. Detailed intent specs live in `docs/intents/`; update those files when an intent changes.

| Intent | Pillar | User Story | Success Signal |
| --- | --- | --- | --- |
| [`start-tonight`](intents/start-tonight.md) | Organizers And Clubs | I want to start tonight's games quickly. | A group can go from attendance to first match in under one minute. |
| [`invite-friends`](intents/invite-friends.md) | Community And Growth | I want to invite friends to my padel group. | A friend can join from a link or QR without owner handholding. |
| [`join-weekly-group`](intents/join-weekly-group.md) | Players And Friends | I want to join my friends' weekly padel group. | A new player understands the group and can participate immediately. |
| [`claim-player-card`](intents/claim-player-card.md) | Players And Friends | I want to connect my account to my player card without blocking play. | A player can claim or link a group player entry from an invite with minimal friction. |
| [`track-improvement`](intents/track-improvement.md) | Players And Friends | I want to see who is improving. | Players see ratings, levels, form, streaks, and history. |
| [`prove-the-night`](intents/prove-the-night.md) | Players And Friends | I want to prove who won this week. | Results are clear, trusted, and easy to share. |
| [`organize-without-arguments`](intents/organize-without-arguments.md) | Organizers And Clubs | I want fair teams and clear scheduling. | Team selection, court assignment, and standings feel explainable. |
| [`share-the-story`](intents/share-the-story.md) | Community And Growth | I want to post the night's result. | Share output looks good in WhatsApp and social feeds. |
| [`build-season-habit`](intents/build-season-habit.md) | Community And Growth | I want the group to come back next week. | The app shows season progress, upcoming nights, and reasons to return. |

## Feature Decision Rule

Before implementing a feature, define:

1. Which pillar it strengthens.
2. Which intent it serves.
3. What the user should be able to do after the change.
4. What data or UI surface owns the behavior.
5. How to verify it works.

If a feature does not clearly serve a pillar or intent, keep it out of scope.

## Account And Player Identity Principle

Do not make every group player become a required app account. A `group_player` is the core participation record inside a group, and it should stay lightweight so organizers can add friends quickly.

Accounts are optional identity links:

- A friend can exist as a group player without signing up.
- A signed-in account can later claim or link to one or more group player entries by invitation.
- The same real person can have different group player records in different groups.
- Level, rating, streaks, and history are per group, not global by default.
- Group joins should feel like "claim your card" or "join this group", not "create an account before you can play".

This keeps the app smooth for casual weekly groups while still allowing stronger identity features later.

## Current Product Structure

Already started:

- Weekly group home: supports `start-tonight`, `track-improvement`, and `build-season-habit`.
- Friend/player cards: supports `track-improvement` and `prove-the-night`.
- Shareable result card: supports `prove-the-night` and `share-the-story`.
- Local auth bypass: supports faster development, not a product pillar.

## Recommended Build Order

### Phase 1: Weekly Friend Group Loop

Goal: make one group able to play, track, and share weekly.

- Rename remaining admin-like labels to friend-group language.
- Build group invite links and join group screen.
- Add optional account-to-group-player linking through invite links.
- Add explicit local-data import prompt instead of silent account claiming.
- Add smart team balancing using player ratings.
- Add season leaderboard and player profile details.

### Phase 2: Share And Growth Loop

Goal: make the app spread through groups.

- Add QR invite and QR result sharing.
- Add public group preview page.
- Add public leaderboard option.
- Add social-ready result image variants.
- Add recent nights and champion history.

### Phase 3: Organizer Reliability

Goal: make the app reliable enough for clubs and repeated community play.

- Add organizer/admin roles.
- Add attendance planning for next week.
- Add court assignment history and rest fairness.
- Add result dispute/edit audit trail.
- Add CSV/image/PDF exports.

## Naming Direction

Prefer youth/friend language over admin language:

- `Players Pool` -> `Friend Cards`
- `Start Group Night` -> `Start Tonight`
- `Tournament History` -> `Past Nights`
- `Group Leaderboard` -> `Weekly Rankings`
- `Tournament Result` -> `Night Result`

Avoid making the app feel like generic sports admin software. It should feel like a shared scoreboard and weekly ritual for friends.

## Code Touchpoints

- Intent docs: `docs/intents/`
- Group weekly hub: `src/screens/GroupHomeScreen.jsx`
- Friend/player cards: `src/screens/PlayersPoolScreen.jsx`
- Shareable results: `src/screens/TournamentResultScreen.jsx`
- Group invite/join work should likely add a new screen under `src/screens/` and new helpers under `src/utils/`.
- Account linking work should preserve `group_players` as per-group participation records. If schema changes are needed, add nullable account-link fields or a join table rather than replacing group players with auth users.
