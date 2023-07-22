import { saveAs } from "file-saver";
import { UnicodeRange } from "@japont/unicode-range";

import CJK_SC_SUBSET_NORM from "@/components/subset/cjk-sc-subset-norm.js";
import { getFontName } from "@/components/font/font.js";
import { convert } from '@/utils/font-convert.js';

let exports;
let heapu8;

const generateSubset = (face, unicodeArray) => {
  const input = exports.hb_subset_input_create_or_fail();
  const unicode_set = exports.hb_subset_input_unicode_set(input);
  for (const unicode of unicodeArray) {
    exports.hb_set_add(unicode_set, unicode.codePointAt(0));
  }
  // exports.hb_subset_input_set_drop_hints(input, true);
  const subset = exports.hb_subset_or_fail(face, input);
  /* Clean up */
  exports.hb_subset_input_destroy(input);
  /* Get result blob */
  const resultBlob = exports.hb_face_reference_blob(subset);
  const offset = exports.hb_blob_get_data(resultBlob, 0);
  const subsetByteLength = exports.hb_blob_get_length(resultBlob);

  // Output font data(Uint8Array)
  const subsetFontBlob = heapu8.slice(offset, offset + subsetByteLength);

  exports.hb_blob_destroy(resultBlob);
  exports.hb_face_destroy(subset);

  return subsetFontBlob;
};

const urlEncode = str => {
  let result = str.replace(/\s/g, "_");
  return encodeURIComponent(result);
};

const generateCSS = (index, fontName, fontUrl, fontDisplay, fontUnicodeRange) => {
  return `/* [${index}] */
@font-face {
    font-family: '${fontName}';
    font-display: ${fontDisplay};
    src: url(${fontUrl}) format('opentype');
    unicode-range: ${fontUnicodeRange};
}

`;
};

const generateSubsetList = (fontFileName, fontDisplay, fontBlob) => {
  WebAssembly.instantiateStreaming(fetch("hb-subset.wasm")).then(result => {
    exports = result.instance.exports;
    heapu8 = new Uint8Array(exports.memory.buffer);

    const start = Date.now();
    const fontBlobPointer = exports.malloc(fontBlob.byteLength);
    heapu8.set(new Uint8Array(fontBlob), fontBlobPointer);

    const blob = exports.hb_blob_create(fontBlobPointer, fontBlob.byteLength, 2 /*HB_MEMORY_MODE_WRITABLE*/, 0, 0);
    const face = exports.hb_face_create(blob, 0);
    exports.hb_blob_destroy(blob);

    const fontName = getFontName(fontFileName);

    // webfont css
    let cssContent = "";

    // webfont sample html
    const sampleHtmlContent = `<!DOCTYPE html><html><head><meta charset=UTF-8><meta http-equiv=X-UA-Compatible content="IE=edge"><meta name=viewport content="width=device-width,initial-scale=1"><title>DouFontTester</title><link rel=stylesheet href=./font.css><body><div class=wrapper><p class=no-font>字体名称: ${fontName}</p><hr><p>abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ</p><p>01234567890.:,;'"(!?)+-*/=</p><hr><p style=font-size:1em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:1.5em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:2em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:2.5em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:3em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:3.5em>The quick brown fox jumps over the lazy dog.</p><p style=font-size:1em>我能吞下玻璃而不伤身体。</p><p style=font-size:1.5em>我能吞下玻璃而不伤身体。</p><p style=font-size:2em>我能吞下玻璃而不伤身体。</p><p style=font-size:2.5em>我能吞下玻璃而不伤身体。</p><p style=font-size:3em>我能吞下玻璃而不伤身体。</p><p style=font-size:3.5em>我能吞下玻璃而不伤身体。</p></div><style>p:not(.no-font){font-family:${fontName}}p{padding:0;margin:0;margin-bottom:10px}</style>`;

    // final zip
    const zip = new JSZip();
    const fontsFolder = zip.folder("fonts");

    var index = 0;
    CJK_SC_SUBSET_NORM.split("\n").forEach(unicodeRange => {
      const unicodeRangeArray = unicodeRange.split(",");
      const unicodeArray = UnicodeRange.parse(unicodeRangeArray).map(cp => String.fromCodePoint(cp));
      const subsetFontBlob = generateSubset(face, unicodeArray);

      const fontSliceFileName = `${urlEncode(fontName)}_${index++}.woff2`;
      fontsFolder.file(fontSliceFileName, convert(subsetFontBlob, 'sfnt', 'woff2'));
      cssContent += generateCSS(index, fontName, `./fonts/${fontSliceFileName}`, fontDisplay, unicodeRangeArray);
    });

    zip.file("font.css", cssContent);
    zip.file("sample.html", sampleHtmlContent);

    console.info("✨ Subset done in", Date.now() - start, "ms");

    zip.generateAsync({ type: "blob" }).then(function (content) {
      saveAs(content, "example.zip");
    });

    console.info(`Wrote subset to: example.zip`);

    exports.hb_face_destroy(face);
    exports.free(fontBlobPointer);
  });
};

export default generateSubsetList;
