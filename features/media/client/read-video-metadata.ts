export type VideoMetadata = {
  durationSeconds: number;
  width: number;
  height: number;
};

export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      URL.revokeObjectURL(objectUrl);
    };
    const onLoadedMetadata = () => {
      const durationSeconds = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : 0;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (!durationSeconds || !width || !height) {
        reject(new Error("Video metadata is incomplete."));
        return;
      }
      resolve({ durationSeconds, width, height });
    };
    const onError = () => {
      cleanup();
      reject(new Error("Unable to read video metadata."));
    };

    video.preload = "metadata";
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
    video.src = objectUrl;
    video.load();
  });
}
