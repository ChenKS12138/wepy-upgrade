const fs = require("fs");
const processWepyFileText = require("./resolveWpy");
const walkDirectory = require("./walkDirectory");

const targerPath = "/Users/brucezhou/Documents/codes/GitHub/wepy-demo-1.7/src";

walkDirectory(targerPath, (path, extensionName) => {
  if (["wpy"].includes(extensionName)) {
    const handledText = processWepyFileText(fs.readFileSync(path).toString());
    fs.writeFileSync(path, handledText);
  }
});
