const fs = require("fs");
const resolveWpy = require("./resovle/resovleWpy");
const path = require("path");
const resolveStylusFile = require("./resovle/resolveStylusFile");
const walkDirectory = require("./walkDirectory");

const targerPath =
  "/Users/brucezhou/Documents/codes/GitHub/Undergraduate-develop/src/";

walkDirectory(targerPath, (originPath, fileName, extensionName, dirName) => {
  if (["wpy"].includes(extensionName)) {
    const handledText = resolveWpy(
      fs.readFileSync(originPath).toString(),
      originPath,
      targerPath
    );
    // fs.writeFileSync(originPath, handledText);
  }
  // if (["styl"].includes(extensionName)) {
  //   const handledText = resolveStylusFile(
  //     fs.readFileSync(originPath).toString()
  //   );
  //   fs.writeFileSync(originPath, handledText);
  //   fs.renameSync(originPath, path.join(dirName, fileName + ".less"));
  // }
});
