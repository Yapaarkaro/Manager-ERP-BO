import { EDGE_FUNCTIONS_URL } from '@/lib/supabase';

export interface InvoiceQRData {
  invoiceId: string;
  businessId: string;
  type: 'sale' | 'purchase' | 'return' | 'po';
}

export function generateInvoiceLinkURL(data: InvoiceQRData): string {
  const params = new URLSearchParams({
    invoice_id: data.invoiceId,
    business_id: data.businessId,
    type: data.type,
  });
  return `${EDGE_FUNCTIONS_URL}/invoice-link?${params.toString()}`;
}

// Minimal QR Code encoder (Mode Byte, ECC L, version auto-select)
// Produces a boolean matrix that can be rendered as inline SVG

const EC_CODEWORDS_L = [0,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30];
const TOTAL_CODEWORDS = [0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];
const DATA_CODEWORDS_L = TOTAL_CODEWORDS.map((t, i) => i === 0 ? 0 : t - EC_CODEWORDS_L[i]);
const NUM_BLOCKS_L = [0,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25];

function getVersion(dataLen: number): number {
  for (let v = 1; v <= 40; v++) {
    const capacity = DATA_CODEWORDS_L[v];
    const headerBits = v <= 9 ? 4 + 8 + 8 : 4 + 16 + 8;
    const availableBytes = capacity - Math.ceil(headerBits / 8);
    if (dataLen <= availableBytes) return v;
  }
  return 40;
}

function getSize(version: number): number {
  return 17 + version * 4;
}

function makeMatrix(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function makeReserved(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

function setModule(matrix: boolean[][], reserved: boolean[][], r: number, c: number, val: boolean) {
  if (r >= 0 && r < matrix.length && c >= 0 && c < matrix.length) {
    matrix[r][c] = val;
    reserved[r][c] = true;
  }
}

function addFinderPattern(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= matrix.length || c < 0 || c >= matrix.length) continue;
      const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
      const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      setModule(matrix, reserved, r, c, !isBorder && (isOuter || isInner));
    }
  }
}

function addAlignmentPattern(matrix: boolean[][], reserved: boolean[][], row: number, col: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = row + dr, c = col + dc;
      if (reserved[r]?.[c]) return;
    }
  }
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const val = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
      setModule(matrix, reserved, row + dr, col + dc, val);
    }
  }
}

const ALIGNMENT_POSITIONS: number[][] = [
  [],[], [6,18], [6,22], [6,26], [6,30], [6,34],
  [6,22,38], [6,24,42], [6,26,46], [6,28,50], [6,30,54], [6,32,58], [6,34,62],
  [6,26,46,66], [6,26,48,70], [6,26,50,74], [6,30,54,78], [6,30,56,82], [6,30,58,86], [6,34,62,90],
  [6,28,50,72,94], [6,26,50,74,98], [6,30,54,78,102], [6,28,54,80,106], [6,32,58,84,110], [6,30,58,86,114], [6,34,62,90,118],
  [6,26,50,74,98,122], [6,30,54,78,102,126], [6,26,52,78,104,130], [6,30,56,82,108,134], [6,34,60,86,112,138], [6,30,58,86,114,142], [6,34,62,90,118,146],
  [6,30,54,78,102,126,150], [6,24,50,76,102,128,154], [6,28,54,80,106,132,158], [6,32,58,84,110,136,162], [6,26,54,82,110,138,166], [6,30,58,86,114,142,170],
];

function addTimingPatterns(matrix: boolean[][], reserved: boolean[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    setModule(matrix, reserved, 6, i, i % 2 === 0);
    setModule(matrix, reserved, i, 6, i % 2 === 0);
  }
}

function reserveFormatBits(reserved: boolean[][], size: number) {
  for (let i = 0; i <= 8; i++) {
    reserved[8] = reserved[8] || [];
    reserved[8][i] = true;
    if (i < size) reserved[i] = reserved[i] || [];
    if (i <= 8) reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[size - 1 - i] = reserved[size - 1 - i] || [];
    reserved[size - 1 - i][8] = true;
    reserved[8][size - 1 - i] = true;
  }
  reserved[size - 8][8] = true;
}

function reserveVersionBits(reserved: boolean[][], size: number, version: number) {
  if (version < 7) return;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      reserved[i][size - 11 + j] = true;
      reserved[size - 11 + j][i] = true;
    }
  }
}

function encodeDataBytes(text: string, version: number): number[] {
  const totalCW = DATA_CODEWORDS_L[version];
  const bytes: number[] = [];
  
  // Mode indicator: byte mode = 0100
  let bitBuffer = 0;
  let bitCount = 0;
  
  const pushBits = (val: number, len: number) => {
    bitBuffer = (bitBuffer << len) | val;
    bitCount += len;
    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((bitBuffer >> bitCount) & 0xFF);
    }
  };
  
  pushBits(0b0100, 4); // byte mode
  const charCountBits = version <= 9 ? 8 : 16;
  pushBits(text.length, charCountBits);
  
  for (let i = 0; i < text.length; i++) {
    pushBits(text.charCodeAt(i) & 0xFF, 8);
  }
  
  pushBits(0, 4); // terminator
  
  // Flush remaining bits
  if (bitCount > 0) {
    bytes.push((bitBuffer << (8 - bitCount)) & 0xFF);
  }
  
  // Pad to total capacity
  let padToggle = 0;
  while (bytes.length < totalCW) {
    bytes.push(padToggle === 0 ? 0xEC : 0x11);
    padToggle ^= 1;
  }
  
  return bytes.slice(0, totalCW);
}

// GF(256) arithmetic for Reed-Solomon
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11D : 0);
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGenPoly(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const newG = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      newG[j] ^= g[j];
      newG[j + 1] ^= gfMul(g[j], GF_EXP[i]);
    }
    g = newG;
  }
  return g;
}

function rsEncode(data: number[], nsym: number): number[] {
  const gen = rsGenPoly(nsym);
  const result = new Array(data.length + nsym).fill(0);
  for (let i = 0; i < data.length; i++) result[i] = data[i];
  
  for (let i = 0; i < data.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return result.slice(data.length);
}

function interleaveBlocks(data: number[], version: number): number[] {
  const totalDC = DATA_CODEWORDS_L[version];
  const totalEC = EC_CODEWORDS_L[version];
  const numBlocks = NUM_BLOCKS_L[version];
  const ecPerBlock = Math.floor(totalEC / numBlocks);
  const shortBlockDC = Math.floor(totalDC / numBlocks);
  const longBlocks = totalDC % numBlocks;
  const shortBlocks = numBlocks - longBlocks;
  
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  
  for (let i = 0; i < numBlocks; i++) {
    const blockSize = i < shortBlocks ? shortBlockDC : shortBlockDC + 1;
    blocks.push(data.slice(offset, offset + blockSize));
    offset += blockSize;
  }
  
  for (let i = 0; i < numBlocks; i++) {
    ecBlocks.push(rsEncode(blocks[i], ecPerBlock));
  }
  
  const result: number[] = [];
  const maxDC = shortBlockDC + 1;
  for (let col = 0; col < maxDC; col++) {
    for (let i = 0; i < numBlocks; i++) {
      if (col < blocks[i].length) result.push(blocks[i][col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (let i = 0; i < numBlocks; i++) {
      if (col < ecBlocks[i].length) result.push(ecBlocks[i][col]);
    }
  }
  
  return result;
}

function placeData(matrix: boolean[][], reserved: boolean[][], codewords: number[], size: number) {
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  
  let col = size - 1;
  let upward = true;
  
  while (col > 0) {
    if (col === 6) col--;
    
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);
    
    for (const row of rows) {
      for (let dc = 0; dc <= 1; dc++) {
        const c = col - dc;
        if (c < 0 || c >= size) continue;
        if (reserved[row][c]) continue;
        if (bitIdx < totalBits) {
          const byteIdx = Math.floor(bitIdx / 8);
          const bitPos = 7 - (bitIdx % 8);
          matrix[row][c] = ((codewords[byteIdx] >> bitPos) & 1) === 1;
          bitIdx++;
        }
      }
    }
    
    col -= 2;
    upward = !upward;
  }
}

const FORMAT_INFOS = [
  0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976,
  0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0,
  0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183, 0x2EDA, 0x2BED,
  0x1689, 0x13BE, 0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B,
];

function applyMask(matrix: boolean[][], reserved: boolean[][], size: number, maskPattern: number): boolean[][] {
  const masked = matrix.map(row => [...row]);
  const maskFn = (r: number, c: number): boolean => {
    switch (maskPattern) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      case 7: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
      default: return false;
    }
  };
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && maskFn(r, c)) {
        masked[r][c] = !masked[r][c];
      }
    }
  }
  return masked;
}

function writeFormatBits(matrix: boolean[][], size: number, maskPattern: number) {
  const eccLevel = 1; // L = 01
  const formatIdx = eccLevel * 8 + maskPattern;
  const bits = FORMAT_INFOS[formatIdx];
  
  // Around top-left finder
  for (let i = 0; i <= 5; i++) matrix[8][i] = ((bits >> (14 - i)) & 1) === 1;
  matrix[8][7] = ((bits >> 8) & 1) === 1;
  matrix[8][8] = ((bits >> 7) & 1) === 1;
  matrix[7][8] = ((bits >> 6) & 1) === 1;
  for (let i = 0; i <= 5; i++) matrix[5 - i][8] = ((bits >> (i)) & 1) === 1;
  
  // Around bottom-left and top-right finders
  for (let i = 0; i <= 7; i++) matrix[size - 1 - i][8] = ((bits >> (14 - i)) & 1) === 1;
  for (let i = 0; i <= 7; i++) matrix[8][size - 8 + i] = ((bits >> (7 - i)) & 1) === 1;
  
  matrix[size - 8][8] = true; // dark module
}

function generateQRMatrix(text: string): boolean[][] {
  const version = getVersion(text.length);
  const size = getSize(version);
  
  const matrix = makeMatrix(size);
  const reserved = makeReserved(size);
  
  // Finder patterns
  addFinderPattern(matrix, reserved, 0, 0);
  addFinderPattern(matrix, reserved, 0, size - 7);
  addFinderPattern(matrix, reserved, size - 7, 0);
  
  // Alignment patterns
  if (version >= 2) {
    const positions = ALIGNMENT_POSITIONS[version];
    for (const r of positions) {
      for (const c of positions) {
        addAlignmentPattern(matrix, reserved, r, c);
      }
    }
  }
  
  // Timing patterns
  addTimingPatterns(matrix, reserved, size);
  
  // Reserve format & version bits
  reserveFormatBits(reserved, size);
  if (version >= 7) reserveVersionBits(reserved, size, version);
  
  // Dark module
  setModule(matrix, reserved, size - 8, 8, true);
  
  // Encode data
  const dataBytes = encodeDataBytes(text, version);
  const codewords = interleaveBlocks(dataBytes, version);
  
  // Place data
  placeData(matrix, reserved, codewords, size);
  
  // Apply mask (use mask 0 for simplicity)
  const masked = applyMask(matrix, reserved, size, 0);
  
  // Write format info
  writeFormatBits(masked, size, 0);
  
  return masked;
}

function matrixToSVG(matrix: boolean[][], size: number): string {
  const moduleCount = matrix.length;
  const quiet = 4;
  const totalModules = moduleCount + quiet * 2;
  const scale = size / totalModules;
  
  let paths = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = (c + quiet) * scale;
        const y = (r + quiet) * scale;
        paths += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${scale.toFixed(2)}" height="${scale.toFixed(2)}"/>`;
      }
    }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/><g fill="black">${paths}</g></svg>`;
}

/**
 * Generate a QR code as an inline SVG string for embedding in HTML/PDF.
 * No external API dependency - renders instantly.
 */
export function generateQRCodeSVG(data: string, size: number = 120): string {
  try {
    const matrix = generateQRMatrix(data);
    return matrixToSVG(matrix, size);
  } catch {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6b7280" font-size="10">QR</text></svg>`;
  }
}

/**
 * Generate an inline QR code image tag for HTML templates.
 * Uses inline SVG for instant rendering without external API calls.
 */
export function generateQRCodeImageTag(data: string, size: number = 120): string {
  const svg = generateQRCodeSVG(data, size);
  const base64 = typeof btoa === 'function'
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg).toString('base64');
  return `<img src="data:image/svg+xml;base64,${base64}" width="${size}" height="${size}" alt="Scan QR Code" style="display:block;" />`;
}
