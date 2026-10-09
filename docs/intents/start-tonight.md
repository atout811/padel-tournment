# Intent: Start Playing

## Pillar

Organizers And Clubs

## User Story

I want to enter the names of the people playing and start a tournament immediately.

## Success Signal

A player can go from opening the app to the first match in under one minute, without creating a group.

## Product Principles

- The home screen is tournament setup.
- Names previously entered on this browser appear as selectable pills.
- Selecting a pill adds a player; selecting it again removes them from today's lineup.
- Remembering names does not create accounts, groups, or player profiles.
- Format and court count are visible from the first screen in compact segmented controls.
- New tournaments use Classic scoring only: standard preset, best of three sets, advantage at deuce.
- Setup uses one narrow mobile column on every screen size.
- History and existing shared tournament links remain accessible.

## Data Notes

- Remembered names live in localStorage under padel-saved-player-names.
- Names are trimmed and deduplicated without regard to case.
- Existing locally cached tournament names seed the remembered list.
- Storage failures must not block play.
- Tournament persistence retains its existing local fallback and optional Supabase behavior.

## Verification

- Add four players and start a league directly.
- Add eight players and start the recommended cup.
- Reload and pick remembered players without typing again.
- Remove a player, reject duplicate/blank names, and use the always-visible format/court controls.
- Verify mobile layout, Arabic, and existing history.
