import woff2compress from "@/assets/woff2/compress_binding.js";
import woff2decompress from "@/assets/woff2/decompress_binding.js";
import { sfnt2woff, woff2sfnt } from "@/utils/woff2sfnt.js";

const supportedFormats = new Set(["sfnt", "woff", "woff2"]);

const detectFormat = function (fontBlob) {
  const magic = fontBlob.slice(0, 4);
};

const standardFormat = function (format) {
  if (format == "truetype") {
    return "sfnt";
  }
  return format;
};

/**
 * support
 * 1. sfnt <-> woff
 * 2. sfnt <-> woff2
 */
const convert = async function (fontBlob, formatFrom, formatTo) {
  formatFrom = standardFormat(formatFrom);
  formatTo = standardFormat(formatTo);

  if (!supportedFormats.has(formatTo)) {
    throw new Error(`Target format unsupported: ${formatTo}`);
  }
  if (!supportedFormats.has(formatFrom)) {
    throw new Error(`Source format unsupported: ${formatFrom}`);
  }

  if (formatFrom == formatTo) {
    return fontBlob;
  }

  if (formatFrom === "woff") {
    fontBlob = woff2sfnt(fontBlob);
  } else if (formatFrom === "woff2") {
    woff2decompress(fontBlob).then(uint8Array => {
      return uint8Array;
    });
  }

  if (formatTo === "woff") {
    fontBlob = sfnt2woff(fontBlob);
  } else if (formatTo === "woff2") {
    woff2compress(fontBlob).then(uint8Array => {
      return uint8Array;
    });
  }
  return fontBlob;
};

export { convert };
