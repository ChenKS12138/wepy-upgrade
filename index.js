const processWepyFileText = require("./resolveWpy");
const path = require("path");
const fs = require("fs");

const targerPath = "/Users/brucezhou/Documents/codes/GitHub/wepy-demo-1.7/src";
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
        : undefined;
      callBack(itemPath, extensionName);
      process.exit(0);
    }
  }
};

walkDirectory(targerPath, (path, extensionName) => {
  if (["wpy"].includes(extensionName)) {
    const handledText = processWepyFileText(fs.readFileSync(path).toString());
    console.log(handledText);
    // fs.writeFileSync(path, handledText);
  }
});
