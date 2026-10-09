# Intent: Prove The Night

## Pillar

Players And Friends

## User Story

I want to prove who won this week.

## Success Signal

Results are clear, trusted, and easy to share.

## Product Principles

- The champion and standings should be obvious.
- Completed matches should be reviewable.
- Reopening/editing should be controlled.
- Results should be preserved in history.
- Celebrate a newly saved win with brief visual feedback; never celebrate an unconfirmed save. Keep the existing scoring and progression rules independent of presentation effects.

## Feature Backlog

- Night result page.
- Final standings.
- Match history.
- MVP or best team highlight.
- Lightweight night awards derived from standings, rating movement, streaks, and match scores.
- Biggest upset and best comeback.
- Result correction flow.

## Data Notes

- Tournament results are stored in tournament JSON.
- Group sessions link nights to group progression.
- Bragging and award labels should be explainable from stored match, team, and participant snapshot data.
- Share tokens allow controlled shared score updates.
- Full live links include a `scoreToken`; anyone with that complete link can choose winners and set active courts through token-gated Supabase RPCs without receiving owner-only lifecycle or team-edit permissions.
- Tournament links without the score token remain read-only for non-owners.

## Verification

- League and cup winners resolve correctly.
- Ended tournaments are read-only unless reopened.
- Result history can reopen or resume where allowed.
- Result sharing output does not expose private score tokens unnecessarily.
- Live score links with a score token can update winners and active courts from a non-owner browser.
