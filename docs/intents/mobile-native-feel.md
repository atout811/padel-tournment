# Intent: Mobile Native Feel

## Pillar

Players And Friends

## User Story

I want the app to feel fast, tactile, and reliable on my phone.

## Success Signal

Players can open the app, start a night, update scores, and share results with the confidence and smoothness of a native mobile app.

## Product Principles

- Prioritize thumb-friendly actions over dense dashboard layouts.
- Use compact UI for small facts; reserve large cards for primary actions or outcomes.
- Prefer native browser/PWA capabilities before adding dependencies.
- Keep local fallback behavior working when offline or without Supabase.
- Make sync state visible without making the UI noisy.
- Add motion only when it improves perceived responsiveness.

## Progressive Implementation

### Phase 1: Tactile Basics

- Add a native-style toast system for success/info messages.
- Replace non-critical alert modals with toasts.
- Add pressed states to primary buttons, nav items, match actions, and cards.
- Add compact skeleton loaders for groups, player cards, history, and result screens.
- Improve safe-area spacing for iPhone home indicator and notches.

### Phase 2: Mobile Controls

- Replace format and court dropdowns with segmented controls.
- Keep main actions in sticky bottom bars where useful.
- Tune mobile inputs:
  - player/group names should use proper capitalization behavior.
  - numeric fields should use numeric keyboards.
  - form focus states should stay visible and stable.
- Reduce full-width number-only cards into strips, chips, or inline rows.

### Phase 3: Sync Confidence

- Add a small sync/offline indicator:
  - Saved
  - Syncing
  - Offline
  - Updated from another device
- Refresh group/player data when the app regains focus.
- Show a subtle update notice when realtime data changes the current group/player list.
- Keep Supabase realtime with polling fallback.
- Avoid blocking local-only usage when Supabase is unavailable.

### Phase 4: PWA Feel

- Polish manifest theme/background colors and icons.
- Add app shortcuts:
  - Start Night
  - Groups
  - History
- Improve install prompt timing so it appears after useful actions, not immediately.
- Verify the offline app shell opens without connection.
- Keep localhost/dev service worker behavior cache-safe.

### Phase 5: Gestures And Motion

- Add screen transitions for core navigation.
- Add small button/card press animations.
- Add pull-to-refresh for group and player screens if it stays reliable.
- Consider swipe gestures only where they are obvious:
  - swipe between main tabs.
  - swipe match cards for quick actions.
- Avoid gesture-only actions; every gesture must have a visible button alternative.

### Phase 6: Conflict And Collaboration

- Show a calm notice when another device updates the current group or tournament.
- Avoid overwriting active local edits without warning.
- Keep score updates deterministic and token-safe.
- For conflicts, prefer reloading latest data and asking the manager to retry the action.

## Feature Backlog

- Native-style toast component.
- Shared app sync status hook.
- Window focus refresh for groups and player pools.
- Realtime update notice for group/player screens.
- Segmented control component.
- Skeleton row/card components.
- PWA shortcuts in `manifest.webmanifest`.
- Install prompt timing rules.
- Pull-to-refresh helper.
- Screen transition wrapper.
- Pressed-state utility classes.
- Offline app shell verification.

## Data Notes

- Sync state should be derived from existing Supabase/localStorage operations.
- Do not add new database tables for UI state.
- Realtime should continue using `postgres_changes` where already enabled, with polling fallback.
- Local-only mode should show `Saved on this device` rather than pretending cloud sync exists.
- Avoid persisting private score tokens in Supabase tournament JSON.

## Verification

- App remains usable without Supabase credentials.
- App remains usable offline after first load.
- `npm run lint` and `npm run build` pass.
- Core flows work on mobile viewport:
  - create/open group.
  - add player.
  - start group night.
  - update score.
  - end tournament.
  - share/download result PNG.
- Bottom actions respect safe-area insets.
- Toasts do not cover primary bottom actions.
- Realtime group/player updates appear without manual refresh when Supabase is configured.
