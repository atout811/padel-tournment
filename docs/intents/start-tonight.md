# Intent: Start Tonight's Games

## Pillar

Organizers And Clubs

## User Story

I want to start tonight's games quickly.

## Success Signal

A group can go from attendance selection to first match in under one minute.

## Product Principles

- The organizer should not need to explain the app before play starts.
- Attendance should be fast: select regulars, add guests, choose courts, start.
- The app should recommend sensible defaults instead of forcing configuration.
- The first match should appear immediately after setup.

## Feature Backlog

- Attendance checklist for regular players.
- Guest player quick-add.
- Recommended format based on player count.
- One-tap court count selection.
- Smart default scoring settings.
- Resume interrupted setup.

## Data Notes

- Uses `group_players` as the pool of regular players.
- Guests can remain temporary tournament/session participants.
- Starting a group night should create a `group_session` and linked tournament.

## Verification

- A group with 4 players can start a league night.
- A group with 8 players can start a cup night.
- Guests can be added without becoming group players.
- LocalStorage fallback still works when Supabase is unavailable.
