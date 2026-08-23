# Video Detail Metadata

## Goal

Replace the static English metadata labels on public video detail pages with a concise Chinese video-information block sourced from the existing `video.videoDetails` data.

## Rendering

- The block is titled `视频信息`.
- Available values are shown in this order: formatted duration, `width × height`, uppercase codec.
- Values are separated with ` · `.
- Missing values are omitted; the block is not rendered when no video metadata exists.

## Data Flow

`getPublicVideoBySlug` already selects and maps `duration_seconds`, `width`, `height`, and `codec` into `PublicVideoItem.videoDetails`. The detail component consumes that existing data without adding a new request or changing the route.

## Verification

Add a component-level rendering test for populated metadata and for the fully absent metadata case. Run the focused test and TypeScript check after the implementation.
