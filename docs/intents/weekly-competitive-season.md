# Intent: Weekly Competitive Season

## Pillar

Community And Growth

## User Story

I want every weekly padel night to count toward an ongoing friendly competition.

## Success Signal

Friends come back next week because rankings, streaks, awards, and season stories are still alive.

## Product Principles

- The app should create a reason to return every week.
- Competition should feel friendly, social, and visible.
- Each night should affect a bigger season story.
- Players should know what they are chasing before the next night starts.
- The group should celebrate progress, not only winners.

## Feature Backlog

- Current season dashboard on group home.
- Season leaderboard.
- Nights played and matches played totals.
- Current leader.
- Most improved player.
- Longest active streak.
- Last night champion.
- Weekly awards after each night.
- MVP by biggest rating points gained, with ties allowed.
- Player rank movement after each night.
- Next week hooks, such as "one win away from #1".
- Season recap share card.

## Data Notes

- V1 can derive season stats from existing `group_players`, `group_sessions`, and tournament history.
- `group_players.initialLevel`, `rating`, `matchesPlayed`, `wins`, `losses`, `currentStreak`, and `bestStreak` already support a basic season race.
- Tournament `participantMeta` can be used as the before-night snapshot for V1 rank movement.
- Future versions may need explicit `seasons`, `season_entries`, or `weekly_awards` tables.
- Keep seasons per group.
- Do not make season participation require accounts.

## Verification

- Group home shows a season dashboard for active groups.
- Completing a group night updates season-visible stats.
- Result sharing shows MVP and each group player's rank movement.
- New players can join mid-season.
- Season stats remain per group.
- LocalStorage fallback still shows useful season data.
