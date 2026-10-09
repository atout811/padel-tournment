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

## Current Visual Direction

The October redesign replaces the dark club dashboard with a warm paper and clay visual identity. Light mode is the default for new browsers; existing theme preferences remain respected. Forest court graphics, large editorial headings, a distinct player setup sheet, and numbered lineups make the app feel like a casual sports companion. Shared components carry the palette and softer geometry through matches, history, results, and modals. Maintain 44px touch targets, keyboard focus, Arabic layout, and reduced-motion support.

## Mobile-only Refinement

- Keep one mobile column, capped at 512px, even on wide screens.
- Replace the introductory court poster with a compact text heading.
- Keep format and courts visible above the player input using compact controls; remove scoring configuration.
- Keep active courts before standings and secondary sharing, with readable player names and large winner buttons.
- Preserve all scheduling, score updates, round progression, and result reopening logic.

## Match-night Identity And Welcome

- Arabic voice is conversational Egyptian: the Arabic brand is `يلا بادل`. Use short, natural match-day phrases, clear action labels, and straightforward error messages. Avoid literal English translations and infrastructure terms in visible copy.
- Active matches use brief team entrances, a live indicator, and tactile winner controls. Saved wins use one bottom toast with a short entrance, checkmark, and exit. No upper celebration or confetti is shown. New notifications replace the previous notification instead of stacking or reappearing after dismissal. Reduced-motion users get a static acknowledgement.

- Add a compact forest-green banner, local racket illustrations, tennis-ball accents, player initials, and tactile cards. Keep the mobile column and visible settings.
- A welcome animation appears on first app load, including shared tournament URLs, for at most 2.8 seconds. It can be skipped immediately or with Escape.
- Remember the time it appeared in `padel-welcome-last-shown` in localStorage, with a sessionStorage fallback. Show it again only on a new page load at least one hour later; ordinary visits do not extend the cooldown. Never interrupt an ongoing game when the hour expires.
- Initialize the app behind the welcome while blocking interaction with covered content. Keep all tournament routing and score logic unchanged.
- Respect reduced-motion preferences with a static, shorter welcome. Use local SVG/CSS assets with no remote requests or animation dependencies.
- Verify first visit, repeat reload, one-hour boundary, invalid timestamps, blocked storage, skip, and narrow-screen layout.

## Previous Clean Dark Refactor Direction (Historical)

Accepted direction for the full UI/UX restructure:

- Keep the dark club identity, but use a cleaner, flatter mobile interface.
- Reduce nested card chrome, large radii, neon-heavy emphasis, and repeated uppercase labels.
- Make mobile flow the first success metric: Home -> Group/Quick Night -> setup -> first court -> result share.
- Keep `localStorage` fallback, Supabase persistence, score-token safety, and tournament JSON shape unchanged.
- Share setup behavior between quick tournaments and group nights, including automatic League/Cup recommendation from participant count unless the organizer manually overrides it.
- Put active scoring before secondary actions such as live-share links.
- Treat Friend Cards, Start Tonight, Past Nights, and Night Result as the preferred friend-group language.
- Use one calm dark color system: near-black background, subtle surfaces, low-contrast borders, green for primary action/state, and neutral secondary controls.
- Support a comfortable light mode using the same `club-*` design tokens: off-white background, white surfaces, readable dark ink, soft borders, and the same single green primary action.
- Keep group and player pages low-density by default: one primary action, one compact status line, and secondary stats behind detail or lower-priority surfaces.
- Apply the same system to secondary surfaces: auth, install prompts, loaders, edit modals, match log, and exported result assets should not fall back to the old high-chrome style.

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

Accepted Phase 4 implementation:

- Header shows a compact `Cloud`, `Local`, or `Offline` status so players know whether they are in Supabase sync mode, local fallback mode, or offline mode.
- Header includes a persisted dark/light theme toggle for players who need better daytime visibility.
- Live tournaments refresh through the existing tournament service when the app regains focus, applying only newer tournament data.
- PWA shortcuts open quick setup, groups, and history when there is no active night to resume.
- Install prompts wait for meaningful app use or a long fallback delay, and dismissal cools down for one week.
- Live queued matches use `Set active` language and can be promoted into active courts without changing match results, standings, or tournament JSON shape.

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
