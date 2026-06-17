# Intent: Track Improvement

## Pillar

Players And Friends

## User Story

I want to see who is improving.

## Success Signal

Players see ratings, levels, form, streaks, and history.

## Product Principles

- Progress should be visible after every completed night.
- Ratings should feel explainable, not mysterious.
- Friend cards should make every player feel part of the story.
- Per-group progress matters more than global stats.

## Feature Backlog

- Player profile screen.
- Rating change per night.
- Recent form line.
- Best streak and current streak.
- Best partner and toughest opponent.
- Most improved this month.

## Data Notes

- Current stats live on `group_players`.
- Session deltas are calculated from completed tournament matches.
- Future profile details may need match-level player history.

## Verification

- Completing a group night updates player stats once.
- Reopening a night does not double-apply stats.
- Guests do not accidentally update group player stats.
- Local and Supabase-backed flows match.
