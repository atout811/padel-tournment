# Intent: Claim Player Card

## Pillar

Players And Friends

## User Story

I want to connect my account to my player card without blocking play.

## Success Signal

A player can claim or link a group player entry from an invite with minimal friction.

## Product Principles

- A group player is not the same thing as an auth account.
- Claiming a card should be optional.
- A real person can have different cards in different groups.
- Per-group level/rating/history stays on `group_players`.
- Do not silently claim local data when switching accounts.

## Feature Backlog

- Claim card from invite link.
- Link signed-in account to an existing group player.
- Show "claimed" state on a friend card.
- Prevent accidental duplicate claims.
- Unlink or transfer card with owner control.

## Data Notes

- Preferred schema direction: nullable account link field on `group_players` or a dedicated join table.
- Do not replace `group_players` with auth users.
- A single auth user may link to multiple group player records across groups.

## Verification

- Unclaimed group players still work normally.
- Claimed player can see their card after signing in.
- Different groups can have different ratings for the same auth user.
- Switching accounts does not auto-claim another person's card.
