# Intent: Organize Without Arguments

## Pillar

Organizers And Clubs

## User Story

I want fair teams and clear scheduling.

## Success Signal

Team selection, court assignment, and standings feel explainable.

## Product Principles

- The app should reduce social friction, not create new disputes.
- Team generation should use player level/rating when available.
- Court assignment should avoid obvious rest unfairness.
- Manual correction should remain possible for organizers.

## Feature Backlog

- Smart team balancing.
- Explain team balance.
- Avoid repeated partners.
- Rest fairness between matches.
- Manual reorder for upcoming matches.
- Score edit audit trail.

## Data Notes

- Team generation starts in `tournamentBuilder.js`.
- Scheduling logic lives in `scheduling.js`.
- Ratings come from `group_players`, guests can use temporary default levels.

## Verification

- Team balance improves for mixed-level groups.
- Odd player counts still produce valid teams.
- Court assignment avoids team conflicts.
- Manual edits do not corrupt standings.
