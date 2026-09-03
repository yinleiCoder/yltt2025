import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/media/components/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));

import { VideoDetail } from "./video-detail";

const video = {
  id: "video-1",
  slug: "sample-video",
  title: "Sample video",
  excerpt: null,
  publishedAt: "2026-08-20T00:00:00.000Z",
  location: null,
  videoDetails: {
    objectKey: "videos/sample.mp4",
    posterObjectKey: null,
    durationSeconds: 125,
    width: 1920,
    height: 1080,
    codec: "h264",
  },
  videoUrl: null,
  posterUrl: null,
};

describe("VideoDetail", () => {
  it("renders available video metadata in the Chinese information block", () => {
    const html = renderToStaticMarkup(<VideoDetail comments={null} video={video} />);

    expect(html).toContain("视频信息");
    expect(html).toContain("2:05 · 1920 × 1080 · H264");
    expect(html).not.toContain("DURATION");
  });

  it("does not render the information block when every metadata value is absent", () => {
    const html = renderToStaticMarkup(
      <VideoDetail
        comments={null}
        video={{ ...video, videoDetails: { ...video.videoDetails, durationSeconds: null, width: null, height: null, codec: null } }}
      />,
    );

    expect(html).not.toContain("视频信息");
  });
});
