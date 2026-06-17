# Intent: Join A Weekly Group

## Pillar

Players And Friends

## User Story

I want to join my friends' weekly padel group.

## Success Signal

A new player understands the group and can participate immediately.

## Product Principles

- Joining should feel like entering a friend group, not onboarding into enterprise software.
- The minimum join action is name plus optional level.
- Accounts should be optional.
- The player should see their card and ranking context after joining.

## Feature Backlog

- Join group screen.
- Display name and starting level.
- Claim existing card option.
- "You are in" confirmation.
- Show player's group card after join.

## Data Notes

- Joining creates or links a `group_player`.
- Level, rating, and history are per group.
- Avoid global player identity unless the user explicitly links an account.

## Verification

- New player can join without signing in.
- Existing signed-in account can join as a group player.
- Duplicate names are handled clearly.
- Group owner can see the new player in Friend Cards.
