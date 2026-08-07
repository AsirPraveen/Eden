// Minimal ESC/POS command builder for 58mm/80mm thermal receipt printers.
// Output is a base64 string handed to the Bluetooth transport.

const ESC = 0x1b;
const GS = 0x1d;

export class EscPos {
  private bytes: number[] = [];
  readonly cols: number;

  constructor(paperWidth: 58 | 80 = 58) {
    this.cols = paperWidth === 80 ? 48 : 32;
    this.bytes.push(ESC, 0x40); // initialize
  }

  private pushText(text: string) {
    // ASCII-safe: replace ₹ etc. (most cheap printers lack the glyph)
    const safe = text.replace(/₹/g, "Rs.").replace(/[^\x00-\x7F]/g, "?");
    for (let i = 0; i < safe.length; i++) this.bytes.push(safe.charCodeAt(i));
  }

  align(a: "left" | "center" | "right") {
    this.bytes.push(ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2);
    return this;
  }

  bold(on: boolean) {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  size(double: boolean) {
    this.bytes.push(GS, 0x21, double ? 0x11 : 0x00);
    return this;
  }

  line(text = "") {
    this.pushText(text);
    this.bytes.push(0x0a);
    return this;
  }

  /** Wrap long text across lines at column width. */
  wrapped(text: string) {
    const words = text.split(/\s+/);
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > this.cols) {
        this.line(cur.trim());
        cur = w;
      } else {
        cur = (cur + " " + w).trim();
      }
    }
    if (cur) this.line(cur);
    return this;
  }

  /** Left/right pair on one line. */
  row(left: string, right: string) {
    const space = this.cols - left.length - right.length;
    if (space < 1) {
      this.line(left);
      this.align("right").line(right).align("left");
    } else {
      this.line(left + " ".repeat(space) + right);
    }
    return this;
  }

  rule(char = "-") {
    this.line(char.repeat(this.cols));
    return this;
  }

  feed(lines = 3) {
    this.bytes.push(ESC, 0x64, lines);
    return this;
  }

  cut() {
    this.bytes.push(GS, 0x56, 0x42, 0x00); // partial cut (ignored by cutters-less printers)
    return this;
  }

  toBase64(): string {
    let binary = "";
    for (const b of this.bytes) binary += String.fromCharCode(b);
    // btoa is available in RN's Hermes via global polyfill in Expo; fallback manual
    if (typeof btoa === "function") return btoa(binary);
    return base64Encode(this.bytes);
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64Encode(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];
    out += B64[b1 >> 2];
    out += B64[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    out += b2 === undefined ? "=" : B64[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)];
    out += b3 === undefined ? "=" : B64[b3 & 63];
  }
  return out;
}
