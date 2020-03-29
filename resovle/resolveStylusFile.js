const { converter } = require("stylus-converter");
/**
 * 处理style文件
 * @param {String} rawString
 */
const processStyleTag = rawString => {
  return converter(rawString);
};

module.exports = processStyleTag;
