"use client";

import { fetchFile } from "@ffmpeg/util";

import {
  getPreparedMediaName,
  getPreparedMediaType,
  mediaKindForFile,
  needsMediaTranscode,
  type PreparedMediaKind,
} from "./media-format";

export const mediaTranscodeError = "苹果媒体转换失败，请改用 MP4 或 JPEG 后重试。";

type TranscodeProgressHandler = (percentage: number) => void;

let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;

export async function prepareMediaFile(
  file: File,
  onProgress?: TranscodeProgressHandler,
): Promise<File> {
  if (!needsMediaTranscode(file)) return file;

  const kind = mediaKindForFile(file);
  if (kind === "photo") return prepareHeicFile(file, onProgress);

  const ffmpeg = await loadFfmpeg();
  const inputName = `input.${extensionFor(file.name, kind)}`;
  const outputName = getPreparedMediaName(file.name, kind);
  const progressListener = ({ progress }: { progress: number }) => {
    onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))));
  };

  ffmpeg.on("progress", progressListener);
  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec(buildCommand(kind, inputName, outputName));
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as BlobPart], { type: getPreparedMediaType(kind) });
    return new File([blob], outputName, {
      type: getPreparedMediaType(kind),
      lastModified: file.lastModified,
    });
  } catch {
    throw new Error(mediaTranscodeError);
  } finally {
    ffmpeg.off("progress", progressListener);
    await deleteFfmpegFiles(ffmpeg, [inputName, outputName]);
  }
}

async function prepareHeicFile(file: File, onProgress?: TranscodeProgressHandler): Promise<File> {
  try {
    const { default: heic2any } = await import("heic2any");
    onProgress?.(10);
    const converted = await heic2any({ blob: file, toType: "image/webp", quality: 0.85 });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    onProgress?.(100);
    return new File([blob], getPreparedMediaName(file.name, "photo"), {
      type: getPreparedMediaType("photo"),
      lastModified: file.lastModified,
    });
  } catch {
    throw new Error(mediaTranscodeError);
  }
}

async function loadFfmpeg(): Promise<import("@ffmpeg/ffmpeg").FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }] = await Promise.all([import("@ffmpeg/ffmpeg")]);
      const ffmpeg = new FFmpeg();
      const coreBaseUrl = `${window.location.origin}/ffmpeg-core`;
      await ffmpeg.load({
        coreURL: `${coreBaseUrl}/ffmpeg-core.js`,
        wasmURL: `${coreBaseUrl}/ffmpeg-core.wasm`,
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }

  return ffmpegPromise;
}

function buildCommand(kind: PreparedMediaKind, inputName: string, outputName: string): string[] {
  if (kind === "photo") {
    return ["-i", inputName, "-frames:v", "1", "-c:v", "libwebp", "-quality", "85", outputName];
  }

  return [
    "-i",
    inputName,
    "-map_metadata",
    "0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ];
}

async function deleteFfmpegFiles(ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg, names: string[]) {
  await Promise.all(names.map(async (name) => {
    try {
      await ffmpeg.deleteFile(name);
    } catch {
      // A failed conversion may not have created the output file.
    }
  }));
}

function extensionFor(name: string, kind: PreparedMediaKind): string {
  return name.split(".").at(-1)?.toLowerCase() || (kind === "photo" ? "heic" : "mov");
}
