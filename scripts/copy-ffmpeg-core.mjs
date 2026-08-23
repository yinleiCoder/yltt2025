import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = resolve(projectRoot, "node_modules/@ffmpeg/core/dist/esm");
const targetDirectory = resolve(projectRoot, "public/ffmpeg-core");

await mkdir(targetDirectory, { recursive: true });
await Promise.all([
  copyFile(resolve(sourceDirectory, "ffmpeg-core.js"), resolve(targetDirectory, "ffmpeg-core.js")),
  copyFile(resolve(sourceDirectory, "ffmpeg-core.wasm"), resolve(targetDirectory, "ffmpeg-core.wasm")),
]);
