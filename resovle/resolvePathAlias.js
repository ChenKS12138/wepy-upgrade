const path = require("path");
const resolvePathAlias = (rawString, filePath, rootPath) => {
  return rawString.replace(/<config>([\d\D]*?)<\/config>/, configMatched => {
    const relativePath = path.relative(filePath, rootPath);
    return configMatched.replace(
      /@\//g,
      relativePath.substring(0, relativePath.length - 2)
    );
  });
};

module.exports = resolvePathAlias;
