/**
 * Created by Onur Demiralay
 * MIT License Copyright(c) 2014 Onur Demiralay
 *
 * sfnt2woff & woff2sfnt converter based on http://people.mozilla.org/~jkew/woff/woff-2009-09-16.html
 */

/**
 * Updated by Li Jinling
 * browser support
 */
import pako from "pako";

//given bit, do 4byte alignment by finding the nearest number that's divisible by 4.
function fourByteAlign(bit) {
  return (bit + 3) & ~3;
}
/* Validates 4bytealigned checksum against original checksum */
function validateCheckSums(csum1, csum2) {
  if (csum1 !== csum2) {
    throw "Checksum Mismatch!";
  }
}
/* 64-bit unsigned number emulator, if num overflow or underflow, it'll make the necessary adjustments.  */
function convertULong(num) {
  return num >>> 64;
}

/* Calculates checksum for 4byte aligned data */
function calcCheckSum(tableDirEntry, sfntBuf) {
  var offset = tableDirEntry.offset;
  var length = fourByteAlign(tableDirEntry.length);
  var csum = 0;
  for (var i = 0; i < length; i += 4) {
    var data = sfntBuf.getUint32(offset + i);
    csum = convertULong(data + csum); //((data + csum) % 0x100000000); //emulating unsigned 32 bit integer.
  }
  /* If it's the header, then find checksumadjustment and substract from checksumAdj to find the actual checksum. */
  if (tableDirEntry.tag === 1751474532 || tableDirEntry.tag === 1651008868) {
    //1751474532 in decimal is 'head' in ascii 1651008868 is 'bhed' in decimal
    var checkSumAdjustment = sfntBuf.getUint32(offset + 2 * 4); //2nd val is the check sum adjustment
    csum = convertULong(csum - checkSumAdjustment);
  }
  return csum;
}
function concat(arrays) {
  // sum of individual array lengths
  let totalLength = arrays.reduce((acc, value) => acc + value.byteLength, 0);

  let result = new Uint8Array(totalLength);

  if (!arrays.length) return result;

  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0;
  for (let array of arrays) {
    result.set(array, length);
    length += array.byteLength;
  }

  return result;
}
/* Constructs the WOFF data by concatenating WOFF ArrayBuffer
 * Here's a top down structure: Header <- TableDir <- Table Data
 */
function constructWOFF(WOFFHeader, WOFFTableDir, WOFFTableData, WOFFSize) {
  const WOFF_parts = [new Uint8Array(WOFFHeader), new Uint8Array(WOFFTableDir)];
  for (var i = 0; i < WOFFTableData.length; ++i) {
    WOFF_parts.push(WOFFTableData[i]);
  }
  const WOFF = concat(WOFF_parts);

  /* Throw an exception if the WOFF's size doesn't match the size specified in the header */
  if (WOFF.byteLength !== WOFFSize) {
    throw (
      "Error occurred while constructing WOFF! WOFF size doesn't match the size specified in the header! " +
      WOFF.byteLength +
      " != " +
      WOFFSize
    );
  }
  return WOFF;
}

/* Copies the contents of buf1 to buf2
 * This function assumes alignedLen will always be bigger or equal to buf's length.
 */
function fourByteAlignedBuffer(buf, len) {
  var alignedLen = fourByteAlign(len);
  if (alignedLen == len) {
    return buf;
  }
  var alignedBuffer = new ArrayBuffer(alignedLen);
  var aligned = new Uint8Array(alignedBuffer);
  var orig = new Uint8Array(buf);

  aligned.set(orig);
  aligned.fill(0, buf.byteLength);
  return aligned;
}

/*The sfnt based font specifications require that the table directory entries are sorted in ascending order of tag value.
 * comparator function for sort() function.
 * */
function tagComparison(entry1, entry2) {
  var tag1Str = entry1.tag.toString();
  var tag2Str = entry2.tag.toString();

  if (tag1Str < tag2Str) {
    return -1;
  }
  if (tag1Str > tag2Str) {
    return 1;
  }
  return 0;
}

/* Constructs the WOFF Header, This version does not support metadata or private data.
 * if you wish to add support make sure to add necessary changes to the header
 * TODO: Find out if we're suppose to use sfnt versions as woff versions
 */
function constructWOFFHeader(flavor, woffLen, numTables, totalSfntSize) {
  var WOFF_HEADER_LENGTH = 44;
  var WOFF_SIGNATURE = 0x774f4646;
  var WOFFHeader = new ArrayBuffer(WOFF_HEADER_LENGTH);
  var WOFFHeaderView = new DataView(WOFFHeader);

  WOFFHeaderView.setUint32(0, WOFF_SIGNATURE); //Woff Signature
  WOFFHeaderView.setUint32(4, flavor); //Flavor
  WOFFHeaderView.setUint32(8, woffLen); //Woff Length
  WOFFHeaderView.setUint16(12, numTables); //Woff Number of Tables
  WOFFHeaderView.setUint16(14, 0); //Woff Reserved (Always set to 0)
  WOFFHeaderView.setUint32(16, totalSfntSize); //Woff Total SFNT Size
  WOFFHeaderView.setUint16(20, 0); //Woff Major Version
  WOFFHeaderView.setUint16(22, 0); //Woff Minor Version
  WOFFHeaderView.setUint32(24, 0); //Woff Meta Offset
  WOFFHeaderView.setUint32(28, 0); //Woff Meta Length
  WOFFHeaderView.setUint32(32, 0); //Woff Meta Original Length (uncompressed size of meta block)
  WOFFHeaderView.setUint32(36, 0); //Woff Private Offset
  WOFFHeaderView.setUint32(40, 0); //Woff Private Length
  return WOFFHeader;
}

/* Given sfnt (.otf, .ttf) converts it to .woff format.
 * converter is based on http://people.mozilla.org/~jkew/woff/woff-2009-09-16.html
 * */
function sfnt2woff(sfnt) {
  var sfntView = new DataView(sfnt);
  var sfntUint8Array = new Uint8Array(sfnt);
  var tableDirectory = [];

  var SFNT_TABLE_DIR_SIZE = 16; /* 4byte for each tag, checksum, offset, length */
  var SFNT_HEADER_LENGTH = 12; /* 2 byte for each numTables, searchRange, entrySelector, rangeShift, 4 byte for version*/
  var WOFF_TABLE_DIR_SIZE = 20;
  var WOFF_HEADER_LENGTH = 44;

  var numTables = sfntView.getUint16(4);
  var flavor = sfntView.getUint32(0);
  var totalSfntSize = numTables * SFNT_TABLE_DIR_SIZE + SFNT_HEADER_LENGTH; //total expected size of decoded font.
  //var checkSumAdjustment = 0;

  /* Table directory entries start after sfnt header, each entry consist of tag, offset, length, checksum. */
  for (var i = 0; i < numTables; ++i) {
    var next = SFNT_HEADER_LENGTH + i * SFNT_TABLE_DIR_SIZE;
    //Read SFNT Table Directory entries
    var tableDirectoryEntry = {
      tag: sfntView.getUint32(next),
      checksum: sfntView.getUint32(next + 4),
      offset: sfntView.getUint32(next + 8),
      length: sfntView.getUint32(next + 12)
    };
    tableDirectory.push(tableDirectoryEntry);
  }

  /* This might not be needed, sfnt directory should already be sorted by tag. */
  tableDirectory = tableDirectory.sort(tagComparison);

  /* Table Directory Size = numTables * is calculated by multiplying the numTables value in the WOFF header times the size of a single WOFF table directory */
  var woffTableSize = numTables * WOFF_TABLE_DIR_SIZE;
  var woffTableOffset = WOFF_HEADER_LENGTH + woffTableSize; //table dir field starts right after header field.

  var WOFFTableDir = new ArrayBuffer(woffTableSize);
  var WOFFTableDirView = new DataView(WOFFTableDir);
  var WOFFTableData = []; //contains all the font data for every table.

  /* construct WOFF Table Directory */
  for (i = 0; i < numTables; ++i) {
    tableDirectoryEntry = tableDirectory[i];

    /* calculate checksum for each table and check for mismatch */
    var csum = calcCheckSum(tableDirectoryEntry, sfntView);
    validateCheckSums(csum, tableDirectoryEntry.checksum);

    /* sfnt header tag! */
    /*
         if (tableDirectoryEntry.tag === 1751474532 || tableDirectoryEntry.tag === 1651008868) {
         //flavor = sfntView.getUint32(tableDirectoryEntry.offset); //won't work if it's otf
         //checkSumAdjustment = sfntView.getUint32(tableDirectoryEntry.offset + 2 * 4);
         } */
    totalSfntSize += fourByteAlign(tableDirectoryEntry.length);
    var end = tableDirectoryEntry.offset + tableDirectoryEntry.length;
    var start = tableDirectoryEntry.offset;

    /* Slice the buffer to get the data for current table. */

    var sfntSlice = sfntUint8Array.subarray(start, end);

    //compress the data
    var compSfntData = pako.deflate(sfntSlice);
    var compLength = sfntSlice.byteLength < compSfntData.byteLength ? sfntSlice.byteLength : compSfntData.byteLength;
    var woffDataEntry;

    /* if compressed data is equal or larger than uncompressed, use uncompressed data. */
    if (compSfntData.byteLength >= sfntSlice.byteLength) {
      woffDataEntry = fourByteAlignedBuffer(sfntSlice, compLength);
    } else {
      woffDataEntry = fourByteAlignedBuffer(compSfntData, compLength);
    }

    /*Construct Woff Table Directory, WoffTableDir = tag, offset,  compressed length, length, checksum (in that order)*/
    WOFFTableDirView.setUint32(i * WOFF_TABLE_DIR_SIZE, tableDirectoryEntry.tag);
    WOFFTableDirView.setUint32(i * WOFF_TABLE_DIR_SIZE + 4, woffTableOffset);
    WOFFTableDirView.setUint32(i * WOFF_TABLE_DIR_SIZE + 8, compLength);
    WOFFTableDirView.setUint32(i * WOFF_TABLE_DIR_SIZE + 12, tableDirectoryEntry.length);
    WOFFTableDirView.setUint32(i * WOFF_TABLE_DIR_SIZE + 16, tableDirectoryEntry.checksum);

    woffTableOffset += woffDataEntry.byteLength; //update woff offset.
    WOFFTableData.push(woffDataEntry);
  }


  var WOFFHeader = constructWOFFHeader(flavor, woffTableOffset, numTables, totalSfntSize);
  var WOFF = constructWOFF(WOFFHeader, WOFFTableDir, WOFFTableData, woffTableOffset);
  return WOFF;
}

/* Converts Woff to its original format (TTF or OTF) */
function woff2sfnt(woff) {
  var tableDirectory = [];

  var SFNT_HEADER_LENGTH = 12;
  var SFNT_TABLE_DIR_SIZE = 16;
  var WOFF_TABLE_DIR_SIZE = 20;
  var WOFF_HEADER_LENGTH = 44;

  const woffView = new DataView(woff);
  const woffUint8Array = new Uint8Array(woff);

  /* Calculate necessary header fields. */
  var numTables = woffView.getUint16(12);
  var sfntVersion = woffView.getUint32(4);
  var nearestPow2 = Math.pow(2, Math.floor(Math.log(numTables) / Math.log(2)));
  var searchRange = nearestPow2 * 16;
  var entrySelector = Math.log(nearestPow2) / Math.LN2;
  var rangeShift = numTables * 16 - searchRange;

  var SFNTHeader = constructSFNTHeader(sfntVersion, numTables, searchRange, entrySelector, rangeShift);

  /* Table Directory Size = it's calculated by multiplying the numTables value in the SFNT header times the size of a single SFNT table directory */
  var sfntTableSize = numTables * SFNT_TABLE_DIR_SIZE;
  var sfntTableOffset = SFNT_HEADER_LENGTH; //table dir field starts right after header field.

  for (var i = 0; i < numTables; ++i) {
    var next = WOFF_HEADER_LENGTH + i * WOFF_TABLE_DIR_SIZE;
    //read WOFF directory entries
    var tableDirectoryEntry = {
      tag: woffView.getUint32(next),
      offset: woffView.getUint32(next + 4),
      compLen: woffView.getUint32(next + 8),
      origLen: woffView.getUint32(next + 12),
      origChecksum: woffView.getUint32(next + 16)
    };
    tableDirectory.push(tableDirectoryEntry);
    sfntTableOffset += SFNT_TABLE_DIR_SIZE;
  }
  /* This might not be needed, sfnt directory should already be sorted by tag. */
  tableDirectory = tableDirectory.sort(tagComparison);

  var SFNTTableDir = new ArrayBuffer(sfntTableSize);
  var SFNTTableDirView = new DataView(SFNTTableDir);
  var SFNTTableData = []; //contains all the font data for every table.
  /* decompress the */
  for (i = 0; i < numTables; ++i) {
    tableDirectoryEntry = tableDirectory[i];
    var start = tableDirectoryEntry.offset;
    var end = tableDirectoryEntry.offset + tableDirectoryEntry.compLen;

    /* Slice the buffer to get the data for current table. */
    var woffSlice = woffUint8Array.subarray(start, end);
    var sfntDataEntry;

    /* if uncompressed data is not equal to compressed, then uncompress and use the data. */
    if (tableDirectoryEntry.origLen != tableDirectoryEntry.compLen) {
      sfntDataEntry = pako.inflate(woffSlice);
    } else {
      sfntDataEntry = woffSlice;
    }

    /* Construct Sfnt Table Directory, SFNTTableDir = tag, checksum, offset, length */
    SFNTTableDirView.setUint32(i * SFNT_TABLE_DIR_SIZE, tableDirectoryEntry.tag);
    SFNTTableDirView.setUint32(i * SFNT_TABLE_DIR_SIZE + 4, tableDirectoryEntry.origChecksum);
    SFNTTableDirView.setUint32(i * SFNT_TABLE_DIR_SIZE + 8, sfntTableOffset);
    SFNTTableDirView.setUint32(i * SFNT_TABLE_DIR_SIZE + 12, tableDirectoryEntry.origLen);

    /* Check if we need to pad extra 0s (since woff data was 4byte aligned), if they are update sfnt offset accordingly. */
    if (tableDirectoryEntry.origLen % 4 !== 0) {
      sfntDataEntry = fourByteAlignedBuffer(sfntDataEntry, tableDirectoryEntry.origLen);
      sfntTableOffset += sfntDataEntry.byteLength;
    } else {
      sfntTableOffset += tableDirectoryEntry.origLen;
    }

    SFNTTableData.push(sfntDataEntry); //store table data
  }

  var SFNT = constructSFNT(SFNTHeader, SFNTTableDir, SFNTTableData);
  return SFNT;
}

/* Constructs the SFNT data by concatenating SFNT ArrayBuffer
 * Here's a top down structure: Header <- TableDir <- Table Data
 */
function constructSFNT(SFNTHeader, SFNTTableDir, SFNTTableData) {
  const SFNT_parts = [new Uint8Array(SFNTHeader), new Uint8Array(SFNTTableDir)];
  for (var i = 0; i < SFNTTableData.length; ++i) {
    SFNT_parts.push(SFNTTableData[i]);
  }
  const SFNT = concat(SFNT_parts);
  return SFNT;
}

/*Constructs SFNT Header */
function constructSFNTHeader(sfntVersion, numTables, searchRange, entrySelector, rangeShift) {
  var SFNT_HEADER_LENGTH = 12;
  var SFNTHeader = new ArrayBuffer(SFNT_HEADER_LENGTH);
  var SFNTHeaderView = new DataView(SFNTHeader);
  SFNTHeaderView.setInt32(0, sfntVersion); //SFNT Version
  SFNTHeaderView.setUint16(4, numTables); //SFNT Number of Tables
  SFNTHeaderView.setUint16(6, searchRange); //SFNT Search Range (Maximum power of 2 <= numTables) x 16.
  SFNTHeaderView.setUint16(8, entrySelector); //SFNT Entry Selector (Log2(maximum power of 2 <= numTables).
  SFNTHeaderView.setUint16(10, rangeShift); // SFNT Range Shift (NumTables x 16-searchRange.)
  return SFNTHeader;
}

export { sfnt2woff, woff2sfnt };
