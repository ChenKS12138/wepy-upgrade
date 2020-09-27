const path = require("path");
const fs = require("fs");

/**
 * 遍历文件夹
 * @param {String} currentRoot
 * @param {Function<String>} callBack
 */
const walkDirectory = (currentRoot, callBack) => {
  const currentItems = fs.readdirSync(currentRoot);
  for (const item of currentItems) {
    const itemPath = path.join(currentRoot, item);
    if (fs.lstatSync(itemPath).isDirectory()) {
      walkDirectory(itemPath, callBack);
    } else {
      const baseName = path.basename(itemPath);
      const dotPosition = baseName.lastIndexOf(".");
      const fileName = baseName.substring(0, dotPosition);
      const extensionName = baseName.substring(dotPosition + 1);
      callBack(itemPath, fileName, extensionName, path.dirname(itemPath));
    }
  }
};
module.exports = walkDirectory;
