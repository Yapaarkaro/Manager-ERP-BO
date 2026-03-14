/**
 * Client-side Code128B barcode image generator.
 * Produces a PNG data URI for upload compatibility.
 */

const CODE128B_START = 104;
const CODE128_STOP = 106;

const CODE128_PATTERNS: number[] = [
  0x6CC, 0x66C, 0x666, 0x498, 0x48C, 0x44C, 0x4C8, 0x4C4, 0x468, 0x448,
  0x6C8, 0x6C4, 0x688, 0x684, 0x644, 0x648, 0x624, 0x620, 0x610, 0x630,
  0x6A0, 0x680, 0x4A0, 0x4E0, 0x460, 0x590, 0x584, 0x544, 0x5C0, 0x5A0,
  0x560, 0x5D0, 0x5C8, 0x568, 0x588, 0x518, 0x514, 0x50C, 0x5C4, 0x5A4,
  0x564, 0x398, 0x388, 0x328, 0x310, 0x314, 0x334, 0x330, 0x2D8, 0x2D4,
  0x2D0, 0x1B8, 0x1B4, 0x138, 0x190, 0x198, 0x178, 0x174, 0x1D8, 0x1D4,
  0x134, 0x118, 0x114, 0x6B4, 0x6B0, 0x6A4, 0x670, 0x664, 0x638, 0x634,
  0x618, 0x614, 0x5B4, 0x5B0, 0x5A8, 0x574, 0x570, 0x538, 0x534, 0x528,
  0x5B8, 0x578, 0x298, 0x294, 0x264, 0x31C, 0x31A, 0x2DC, 0x29C, 0x28C,
  0x2B0, 0x2AC, 0x26C, 0x350, 0x348, 0x368, 0x338, 0x318, 0x2C8, 0x2C4,
  0x358, 0x340, 0x360, 0x2C0, 0x6BA, 0x6B2, 0x6A6, 0x18EB,
];

function encodeCode128B(text: string): boolean[] {
  const codes: number[] = [CODE128B_START];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 94) codes.push(0);
    else codes.push(code);
  }

  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);
  codes.push(CODE128_STOP);

  const bars: boolean[] = [];
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    const bits = code === CODE128_STOP ? 13 : 11;
    for (let bit = bits - 1; bit >= 0; bit--) {
      bars.push(((pattern >> bit) & 1) === 1);
    }
  }
  bars.push(true, true);
  return bars;
}

function crc32Table(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
}

const CRC_TABLE = crc32Table();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function adler32(data: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function writeU32BE(buf: Uint8Array, offset: number, val: number) {
  buf[offset] = (val >>> 24) & 0xFF;
  buf[offset + 1] = (val >>> 16) & 0xFF;
  buf[offset + 2] = (val >>> 8) & 0xFF;
  buf[offset + 3] = val & 0xFF;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeU32BE(chunk, 0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) crcData[i] = type.charCodeAt(i);
  crcData.set(data, 4);
  writeU32BE(chunk, 8 + data.length, crc32(crcData));
  return chunk;
}

function deflateRaw(input: Uint8Array): Uint8Array {
  const blockSize = 65535;
  const numBlocks = Math.ceil(input.length / blockSize) || 1;
  const output = new Uint8Array(2 + numBlocks * (5 + blockSize) + 4);
  output[0] = 0x78; // CMF
  output[1] = 0x01; // FLG
  let pos = 2;

  for (let i = 0; i < numBlocks; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, input.length);
    const len = end - start;
    const isLast = i === numBlocks - 1;
    output[pos++] = isLast ? 1 : 0;
    output[pos++] = len & 0xFF;
    output[pos++] = (len >> 8) & 0xFF;
    output[pos++] = (~len) & 0xFF;
    output[pos++] = ((~len) >> 8) & 0xFF;
    output.set(input.subarray(start, end), pos);
    pos += len;
  }

  const adler = adler32(input);
  writeU32BE(output, pos, adler);
  pos += 4;
  return output.subarray(0, pos);
}

function buildPng(width: number, height: number, pixels: Uint8Array): Uint8Array {
  const rowLen = width * 3 + 1; // +1 for filter byte
  const rawData = new Uint8Array(height * rowLen);
  for (let y = 0; y < height; y++) {
    rawData[y * rowLen] = 0; // no filter
    rawData.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * rowLen + 1);
  }

  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const compressed = deflateRaw(rawData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const totalLen = signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length;
  const png = new Uint8Array(totalLen);
  let off = 0;
  png.set(signature, off); off += signature.length;
  png.set(ihdrChunk, off); off += ihdrChunk.length;
  png.set(idatChunk, off); off += idatChunk.length;
  png.set(iendChunk, off);
  return png;
}

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

export async function generateBarcodeImage(barcodeValue: string): Promise<string | null> {
  if (!barcodeValue || barcodeValue.trim().length === 0) return null;

  try {
    const text = barcodeValue.trim();
    const bars = encodeCode128B(text);

    const barWidth = 2;
    const barcodeHeight = 80;
    const padding = 20;
    const textHeight = 20;
    const totalWidth = bars.length * barWidth + padding * 2;
    const totalHeight = barcodeHeight + textHeight + padding * 2;

    const pixels = new Uint8Array(totalWidth * totalHeight * 3);
    pixels.fill(255);

    for (let i = 0; i < bars.length; i++) {
      if (bars[i]) {
        const x0 = padding + i * barWidth;
        for (let bw = 0; bw < barWidth; bw++) {
          const x = x0 + bw;
          if (x >= totalWidth) continue;
          for (let y = padding; y < padding + barcodeHeight; y++) {
            const idx = (y * totalWidth + x) * 3;
            pixels[idx] = 0;
            pixels[idx + 1] = 0;
            pixels[idx + 2] = 0;
          }
        }
      }
    }

    const charWidth = 8;
    const charHeight = 12;
    const textStartX = Math.floor((totalWidth - text.length * charWidth) / 2);
    const textStartY = padding + barcodeHeight + 4;

    for (let ci = 0; ci < text.length; ci++) {
      const glyph = MINI_FONT[text[ci]] || MINI_FONT['?'] || [];
      const cx = textStartX + ci * charWidth;
      for (let row = 0; row < glyph.length && row < charHeight; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 7; col++) {
          if ((bits >> (6 - col)) & 1) {
            const px = cx + col;
            const py = textStartY + row;
            if (px >= 0 && px < totalWidth && py >= 0 && py < totalHeight) {
              const idx = (py * totalWidth + px) * 3;
              pixels[idx] = 0;
              pixels[idx + 1] = 0;
              pixels[idx + 2] = 0;
            }
          }
        }
      }
    }

    const pngBytes = buildPng(totalWidth, totalHeight, pixels);
    const b64 = uint8ToBase64(pngBytes);
    return `data:image/png;base64,${b64}`;
  } catch (error) {
    console.error('Error generating barcode image:', error);
    return null;
  }
}

const MINI_FONT: Record<string, number[]> = {
  '0': [0x1C,0x22,0x26,0x2A,0x32,0x22,0x1C,0x00],
  '1': [0x08,0x18,0x08,0x08,0x08,0x08,0x1C,0x00],
  '2': [0x1C,0x22,0x02,0x0C,0x10,0x20,0x3E,0x00],
  '3': [0x1C,0x22,0x02,0x0C,0x02,0x22,0x1C,0x00],
  '4': [0x04,0x0C,0x14,0x24,0x3E,0x04,0x04,0x00],
  '5': [0x3E,0x20,0x3C,0x02,0x02,0x22,0x1C,0x00],
  '6': [0x0C,0x10,0x20,0x3C,0x22,0x22,0x1C,0x00],
  '7': [0x3E,0x02,0x04,0x08,0x10,0x10,0x10,0x00],
  '8': [0x1C,0x22,0x22,0x1C,0x22,0x22,0x1C,0x00],
  '9': [0x1C,0x22,0x22,0x1E,0x02,0x04,0x18,0x00],
  'A': [0x08,0x14,0x22,0x22,0x3E,0x22,0x22,0x00],
  'B': [0x3C,0x22,0x22,0x3C,0x22,0x22,0x3C,0x00],
  'C': [0x1C,0x22,0x20,0x20,0x20,0x22,0x1C,0x00],
  'D': [0x38,0x24,0x22,0x22,0x22,0x24,0x38,0x00],
  'E': [0x3E,0x20,0x20,0x3C,0x20,0x20,0x3E,0x00],
  'F': [0x3E,0x20,0x20,0x3C,0x20,0x20,0x20,0x00],
  'G': [0x1C,0x22,0x20,0x2E,0x22,0x22,0x1E,0x00],
  'H': [0x22,0x22,0x22,0x3E,0x22,0x22,0x22,0x00],
  'I': [0x1C,0x08,0x08,0x08,0x08,0x08,0x1C,0x00],
  'J': [0x0E,0x04,0x04,0x04,0x04,0x24,0x18,0x00],
  'K': [0x22,0x24,0x28,0x30,0x28,0x24,0x22,0x00],
  'L': [0x20,0x20,0x20,0x20,0x20,0x20,0x3E,0x00],
  'M': [0x22,0x36,0x2A,0x2A,0x22,0x22,0x22,0x00],
  'N': [0x22,0x32,0x2A,0x26,0x22,0x22,0x22,0x00],
  'O': [0x1C,0x22,0x22,0x22,0x22,0x22,0x1C,0x00],
  'P': [0x3C,0x22,0x22,0x3C,0x20,0x20,0x20,0x00],
  'Q': [0x1C,0x22,0x22,0x22,0x2A,0x24,0x1A,0x00],
  'R': [0x3C,0x22,0x22,0x3C,0x28,0x24,0x22,0x00],
  'S': [0x1C,0x22,0x20,0x1C,0x02,0x22,0x1C,0x00],
  'T': [0x3E,0x08,0x08,0x08,0x08,0x08,0x08,0x00],
  'U': [0x22,0x22,0x22,0x22,0x22,0x22,0x1C,0x00],
  'V': [0x22,0x22,0x22,0x22,0x14,0x14,0x08,0x00],
  'W': [0x22,0x22,0x22,0x2A,0x2A,0x36,0x22,0x00],
  'X': [0x22,0x22,0x14,0x08,0x14,0x22,0x22,0x00],
  'Y': [0x22,0x22,0x14,0x08,0x08,0x08,0x08,0x00],
  'Z': [0x3E,0x02,0x04,0x08,0x10,0x20,0x3E,0x00],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '-': [0x00,0x00,0x00,0x3E,0x00,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x00],
  '/': [0x02,0x04,0x04,0x08,0x10,0x10,0x20,0x00],
  '?': [0x1C,0x22,0x02,0x04,0x08,0x00,0x08,0x00],
};
