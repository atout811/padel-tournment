# Intent: Share The Story

## Pillar

Community And Growth

## User Story

I want to post the night's result.

## Success Signal

Share output looks good in WhatsApp and social feeds.

## Product Principles

- Sharing should be one tap where supported.
- The image/text should be understandable outside the app.
- The result should celebrate the group, not just raw scores.
- Browser-native sharing is preferred before adding dependencies.

## Feature Backlog

- Share result image.
- Weekly champion card.
- Player achievement card.
- Season recap card.
- QR result link.

## Data Notes

- Current share card is generated with browser canvas in `TournamentResultScreen.jsx`.
- Generated images should not include private tokens.
- Text fallback should work where file sharing is unsupported.

## Verification

- Share button works on supported mobile browsers.
- Clipboard fallback works on desktop.
- Generated image handles long group and player names.
- No private score token is embedded in share output.
