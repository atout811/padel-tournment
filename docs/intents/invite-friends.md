# Intent: Invite Friends

## Pillar

Community And Growth

## User Story

I want to invite friends to my padel group.

## Success Signal

A friend can join from a link or QR without owner handholding.

## Product Principles

- Invites should work well in WhatsApp.
- A friend should understand the group before committing.
- Joining should not require an account first.
- Owners should be able to control whether joins are open or require approval later.

## Feature Backlog

- Group invite link.
- QR invite code.
- Public group preview.
- Join as a new player.
- Claim an existing player card.
- Owner approval mode.

## Data Notes

- Invites should point to a group-level join route.
- Do not expose private owner data in public previews.
- Invite tokens should be revocable if we add private groups.

## Verification

- Invite link opens the intended group.
- Non-authenticated users can see the join path.
- Signed-in users can link themselves without creating duplicate players.
- Invalid or revoked invite links show a clear error.
