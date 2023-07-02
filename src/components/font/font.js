const MIME_FONT_TYPE = new Map([
  ["font/otf", "opentype"],
  ["font/ttf", "truetype"],
  ["font/woff", "woff"],
  ["font/woff2", "woff2"]
]);

const FONT_COMMON_WEIGHT = new Map([
  ["Thin", "100"],
  ["ExtraLight", "200"],
  ["Light", "300"],
  ["Regular", "400"],
  ["Medium", "500"],
  ["SemiBold", "600"],
  ["Bold", "700"],
  ["ExtraBold", "800"],
  ["Black", "900"]
]);

/**
 * 预期字体文件名 ${NAME}-${COMMON_WEIGHT_NAME}.${EXTENSION}
 */
const getFontName = (fileName) => {
  const fileNameWithoutExtensions = fileName.split(".")[0];
  return fileNameWithoutExtensions.split("-")[0];
};

export { getFontName };
