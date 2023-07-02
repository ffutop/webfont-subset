import * as JSZip from "jszip";
import { saveAs } from "file-saver";
import { UnicodeRange } from "@japont/unicode-range";

// import CJK_SC_SUBSET_NORM from "@/components/subset/cjk-sc-subset-norm.js";
const CJK_SC_SUBSET_NORM = `U+4F60-4F70`;

const hbSubset = await WebAssembly.instantiateStreaming(fetch("hb-subset.wasm"));
const exports = hbSubset.instance.exports;
const heapu8 = new Uint8Array(exports.memory.buffer);

const generateSubset = (face, SUBSET_TEXT, fontName, fontsFolder) => {
  const input = exports.hb_subset_input_create_or_fail();
  const unicode_set = exports.hb_subset_input_unicode_set(input);
  for (const text of SUBSET_TEXT) {
    exports.hb_set_add(unicode_set, text.codePointAt(0));
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
  const subsetFontBlob = heapu8.subarray(offset, offset + subsetByteLength);

  fontsFolder.file(fontName, subsetFontBlob);
  fontsFolder.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, "example.zip");
  });

  exports.hb_blob_destroy(resultBlob);
  exports.hb_face_destroy(subset);
};

const generateSubsetList = (fontName, fontBlob) => {
  const start = Date.now();
  const fontBlobPointer = exports.malloc(fontBlob.byteLength);
  heapu8.set(new Uint8Array(fontBlob), fontBlobPointer);

  const blob = exports.hb_blob_create(fontBlobPointer, fontBlob.byteLength, 2 /*HB_MEMORY_MODE_WRITABLE*/, 0, 0);
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  const zip = new JSZip();
  const fontsFolder = zip.folder("fonts");

  var index = 0;
  CJK_SC_SUBSET_NORM.split("\n").forEach(unicodeRange => {
    const unicodeRangeArray = unicodeRange.split(",");
    const unicodeArray = UnicodeRange.parse(unicodeRangeArray).map(cp => String.fromCodePoint(cp));
    const subsetFontBlob = generateSubset(face, "你好", `${index++}.otf`, zip);
    // fontsFolder.file(`${index++}.otf`, subsetFontBlob);
  });

  console.info("✨ Subset done in", Date.now() - start, "ms");

  zip.generateAsync({ type: "blob" }).then(function (content) {
    // saveAs(content, "example.zip");
  });

  console.info(`Wrote subset to: example.zip`);

  /* Clean up */
  exports.hb_face_destroy(face);
  exports.free(fontBuffer);
};

export default generateSubsetList;
