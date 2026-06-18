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

- WhatsApp tournament summary PNG.
- One-tap text brag for native share or clipboard fallback.
- Downloadable tournament summary PNG fallback.
- Weekly champion card.
- Night awards for champion, MVP, biggest climber, and streak breaker when data is available.
- MVP and player movement result card.
- Player achievement card.
- Season recap card.
- QR result link.

## Data Notes

- Current share card is generated with browser canvas in `TournamentResultScreen.jsx`.
- Player movement can be derived from the tournament participant snapshot plus rating deltas.
- Social awards should be derived from existing results and player snapshots, not extra point-by-point data.
- Generated images should not include private tokens.
- Text fallback should work where file sharing is unsupported.
- Browsers cannot reliably force a PNG attachment directly into WhatsApp. Use native file sharing where supported, then fall back to downloading the PNG and opening WhatsApp with the summary text.

## Verification

- WhatsApp action shares the PNG through the native share sheet where supported.
- WhatsApp fallback downloads the PNG and opens a prefilled WhatsApp text share.
- Download PNG button saves the tournament summary image.
- Text share button opens native sharing where supported or copies the result text.
- Generated image handles long group and player names.
- Shared result card shows MVP ties when multiple players gain the same top rating points.
- No private score token is embedded in share output.
