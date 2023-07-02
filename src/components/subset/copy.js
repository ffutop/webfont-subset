import * as JSZip from "jszip";
import { saveAs } from "file-saver";

const SUBSET_TEXT = "你好";
const generateSubsetList = () => {
  WebAssembly.instantiateStreaming(fetch("hb-subset.wasm")).then(result => {
    fetch("Noto_Sans_SC/NotoSansSC-Regular.otf")
      .then(x => {
        return x.arrayBuffer();
      })
      .then(fontBlob => {
        console.log(result);
        const exports = result.instance.exports;
        const heapu8 = new Uint8Array(exports.memory.buffer);
        const fontBuffer = exports.malloc(fontBlob.byteLength);
        heapu8.set(new Uint8Array(fontBlob), fontBuffer);

        /* Creating a face */
        const blob = exports.hb_blob_create(fontBuffer, fontBlob.byteLength, 2 /*HB_MEMORY_MODE_WRITABLE*/, 0, 0);
        const face = exports.hb_face_create(blob, 0);
        exports.hb_blob_destroy(blob);

        /* Add your glyph indices here and subset */
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
        if (subsetByteLength === 0) {
          exports.hb_blob_destroy(resultBlob);
          exports.hb_face_destroy(subset);
          exports.hb_face_destroy(face);
          exports.free(fontBuffer);
          throw new Error("Failed to create subset font, maybe the input file is corrupted?");
        }

        // Output font data(Uint8Array)
        const subsetFontBlob = heapu8.subarray(offset, offset + exports.hb_blob_get_length(resultBlob));

        const zip = new JSZip();
        zip.file("b.otf", subsetFontBlob);

        zip.generateAsync({ type: "blob" }).then(function (content) {
          saveAs(content, "example.zip");
        });

        /* Clean up */
        exports.hb_blob_destroy(resultBlob);
        exports.hb_face_destroy(subset);
        exports.hb_face_destroy(face);
        exports.free(fontBuffer);
      });
  });
};

export default generateSubsetList;
