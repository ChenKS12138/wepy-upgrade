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
      const extensionName = itemPath.includes(".")
        ? itemPath.substr(itemPath.lastIndexOf(".") + 1)
        : "";
      const fileName = itemPath.includes(".")
        ? itemPath.substr(0, item.lastIndexOf(".") - 1)
        : itemPath;
      callBack(itemPath, fileName, extensionName);
    }
  }
};
module.exports = walkDirectory;
