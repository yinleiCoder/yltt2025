import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const sizes = [16, 32, 48];
const background = [0, 0, 0, 0];
const outline = [0x11, 0x11, 0x11, 0xff];
const foreground = [0xf7, 0xf7, 0xf7];

const rabbit = {
  head: { x: 0.5, y: 0.6, radiusX: 0.27, radiusY: 0.25 },
  leftEar: { from: [0.4, 0.45], to: [0.34, 0.14], radius: 0.095 },
  rightEar: { from: [0.6, 0.45], to: [0.66, 0.14], radius: 0.095 },
  leftInnerEar: { from: [0.4, 0.39], to: [0.35, 0.19], radius: 0.035 },
  rightInnerEar: { from: [0.6, 0.39], to: [0.65, 0.19], radius: 0.035 },
  leftEye: { x: 0.42, y: 0.59, radius: 0.028 },
  rightEye: { x: 0.58, y: 0.59, radius: 0.028 },
  nose: { x: 0.5, y: 0.66, radius: 0.025 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  const nearestX = ax + projection * dx;
  const nearestY = ay + projection * dy;
  return Math.hypot(px - nearestX, py - nearestY);
}

function isInsideEllipse(x, y, ellipse) {
  const normalizedX = (x - ellipse.x) / ellipse.radiusX;
  const normalizedY = (y - ellipse.y) / ellipse.radiusY;
  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function expandEllipse(ellipse, amount) {
  return {
    ...ellipse,
    radiusX: ellipse.radiusX + amount,
    radiusY: ellipse.radiusY + amount,
  };
}

function expandStroke(stroke, amount) {
  return { ...stroke, radius: stroke.radius + amount };
}

function isInsideCircle(x, y, circle) {
  return Math.hypot(x - circle.x, y - circle.y) <= circle.radius;
}

function isInsideStroke(x, y, stroke) {
  return distanceToSegment(
    x,
    y,
    stroke.from[0],
    stroke.from[1],
    stroke.to[0],
    stroke.to[1],
  ) <= stroke.radius;
}

function pixelColor(x, y) {
  const isHead = isInsideEllipse(x, y, rabbit.head);
  const isEar = isInsideStroke(x, y, rabbit.leftEar) || isInsideStroke(x, y, rabbit.rightEar);
  const isOuterHead = isInsideEllipse(x, y, expandEllipse(rabbit.head, 0.018));
  const isOuterEar = isInsideStroke(x, y, expandStroke(rabbit.leftEar, 0.018))
    || isInsideStroke(x, y, expandStroke(rabbit.rightEar, 0.018));
  const isInnerEar = isInsideStroke(x, y, rabbit.leftInnerEar) || isInsideStroke(x, y, rabbit.rightInnerEar);
  const isFaceCutout = isInsideCircle(x, y, rabbit.leftEye)
    || isInsideCircle(x, y, rabbit.rightEye)
    || isInsideCircle(x, y, rabbit.nose);

  if (isInnerEar || isFaceCutout) return outline;
  if (isHead || isEar) return [...foreground, 0xff];
  if (isOuterHead || isOuterEar) return outline;
  return background;
}

function encodePng(size) {
  const supersample = 4;
  const rowBytes = size * 4;
  const raw = Buffer.alloc((rowBytes + 1) * size);

  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (rowBytes + 1);
    raw[rowOffset] = 0;

    for (let x = 0; x < size; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let coveredSamples = 0;

      for (let sampleY = 0; sampleY < supersample; sampleY += 1) {
        for (let sampleX = 0; sampleX < supersample; sampleX += 1) {
          const color = pixelColor(
            (x + (sampleX + 0.5) / supersample) / size,
            (y + (sampleY + 0.5) / supersample) / size,
          );
          red += color[0];
          green += color[1];
          blue += color[2];
          alpha += color[3];
          if (color[3] > 0) coveredSamples += 1;
        }
      }

      const pixelOffset = rowOffset + 1 + x * 4;
      const sampleCount = supersample * supersample;
      raw[pixelOffset] = coveredSamples ? Math.round(red / coveredSamples) : 0;
      raw[pixelOffset + 1] = coveredSamples ? Math.round(green / coveredSamples) : 0;
      raw[pixelOffset + 2] = coveredSamples ? Math.round(blue / coveredSamples) : 0;
      raw[pixelOffset + 3] = Math.round(alpha / sampleCount);
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    signature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;

  images.forEach(({ size, data }, index) => {
    const entryOffset = index * 16;
    directory[entryOffset] = size === 256 ? 0 : size;
    directory[entryOffset + 1] = size === 256 ? 0 : size;
    directory[entryOffset + 2] = 0;
    directory[entryOffset + 3] = 0;
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(data.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...images.map(({ data }) => data)]);
}

const images = sizes.map((size) => ({ size, data: encodePng(size) }));
writeFileSync(new URL("../app/favicon.ico", import.meta.url), encodeIco(images));
console.log(`Generated app/favicon.ico with sizes: ${sizes.join(", ")}`);
