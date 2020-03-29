const fs = require("fs");
const resolveWpy = require("./resovle/resovleWpy");
const resolveStylusFile = require("./resovle/resolveStylusFile");
const walkDirectory = require("./walkDirectory");

const targerPath =
  "/Users/brucezhou/Documents/codes/GitHub/Undergraduate-develop/src/";

walkDirectory(targerPath, (path, fileName, extensionName) => {
  if (["wpy"].includes(extensionName)) {
    const handledText = resolveWpy(
      fs.readFileSync(path).toString(),
      path,
      targerPath
    );
    fs.writeFileSync(path, handledText);
  }
  if (["styl"].includes(extensionName)) {
    const handledText = resolveStylusFile(fs.readFileSync(path).toString);
    fs.writeFileSync(path, handledText);
    fs.renameSync(path, fileName + ".less");
  }
});
