const subsetFont = require("subset-font");
const subsetCharacters = "abcdefghijklmnopqrstuvwxyz";

function toBuffer(arrayBuffer) {
  var buf = new Buffer(arrayBuffer.byteLength);
  var view = new Uint8Array(arrayBuffer);
  for (var i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

function toArrayBuffer(buffer) {
  var arrayBuffer = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(arrayBuffer);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

global.window.slice = function (arrayBuffer, glyphs, format) {
  var buffer = toBuffer(arrayBuffer);
  const subsetBuffer = await subsetFont(buffer, glyphs, {
    targetFormat: format
  });
  return toArrayBuffer(subsetBuffer);
};
