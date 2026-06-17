# Product Intents

Each file in this folder describes one product intent from the Triple Helix framework.

Use these docs as the source of truth before implementation.

## Intents

- [`start-tonight`](start-tonight.md): start a weekly night quickly.
- [`invite-friends`](invite-friends.md): invite friends into a group smoothly.
- [`join-weekly-group`](join-weekly-group.md): join a friend group with minimal friction.
- [`claim-player-card`](claim-player-card.md): optionally link an account to a per-group player card.
- [`track-improvement`](track-improvement.md): see player progress over time.
- [`prove-the-night`](prove-the-night.md): make the winner and standings clear.
- [`organize-without-arguments`](organize-without-arguments.md): reduce disputes around teams, courts, and results.
- [`share-the-story`](share-the-story.md): share the night in WhatsApp and social feeds.
- [`build-season-habit`](build-season-habit.md): make weekly play repeatable.
- [`weekly-competitive-season`](weekly-competitive-season.md): make every week count toward an ongoing friendly competition.

## Implementation Rule

Before building a meaningful product feature:

1. Pick the intent file that owns the behavior.
2. Add or refine the feature idea in that file.
3. Check whether schema/service changes preserve the intent principles.
4. Implement the smallest slice that advances the intent.
5. Update verification notes if the behavior has new risks.
