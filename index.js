const fs = require("fs");
const path = require("path");

const rootDir = path.resolve("./src");

/**
 * 获取所有script标签
 * @param {String} rawString
 * @returns {Array<String>}
 */
const getScripts = rawString => {
  const scriptPattern = /<script>(.|\n)*?<\/script>/g;
  return rawString.match(scriptPattern);
};

/**
 * 获取文本中的所有 import xxx from "xxx"
 * @param {String} rawStirng
 * @param {Array<ImportObject>}
 */
const getImports = rawStirng => {
  const importPattern = /import\s*([\w\-\_]*)\s*from\s*['"]([\w\-\_\.\/\@]*)['"];*/gi;
  return rawStirng.match(importPattern) || [];
};

/**
 * @typedef {ImportObject}
 * @property {Stirng} value
 * @property {String} path
 */

/**
 * @param {String} rawImport
 * @returns {ImportObject}
 */
const parseImport = rawImport => {
  const path = rawImport
    .match(/from\s+["'].*?["'];?/g)[0]
    .replace(/(\s|;|'|"|\.(wpy|vue))/g, "")
    .slice(4);
  const variable = rawImport
    .match(/import\s+(\{|\s|\w|\}|,)*?\s/g)[0]
    .replace(/\s/g, "")
    .slice(6);
  return { path, variable };
};

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
      walkDirectory(itemPath);
    } else {
      callBack(itemPath);
    }
  }
};

/**
 * 清除js代码注释
 * @param {String} rawCodeString
 * @param {String}
 */
const removeCodeComments = rawCodeString => {
  return rawCodeString
    .replace(/\/\/.*?\n/g, "")
    .replace(/\/\*(.|\n)*?\*\//g, "");
};

/**
 * 从components中获取所有Components名字
 * @param {String} rawString
 */
const getUsedComponents = rawString => {
  return rawString
    .match(/components(.|\n)+\}/g)
    .map(x => x.replace(/\r|\n|\s/g, "").slice(11))
    .map(x =>
      x
        .slice(1, x.length - 1)
        .split(",")
        .reduce((prev, current) => {
          if (current.includes(":")) {
            prev.push(current.split(":")[1]);
          } else {
            prev.push(current);
          }
          return prev;
        }, [])
    )
    .reduce((prev, current) => prev.concat(current), []);
};

/**
 * 从wepy class中提取config
 * @param {String} rawString
 * @returns {String}
 */
const getUsedConfig = rawString => {
  return rawString.match(/config\s*=\s*{(.|\n)*?};?/g)[0];
};

/**
 * 生成<config>{usingComponents}</config>
 * @param {Array<Object>} componentArray
 * @returns {String}
 */
const generageConfigTag = componentArray => {
  const components = {};
  componentArray.forEach(componentObject => {
    const { variable, path } = componentObject;
    Reflect.defineProperty(components, variable, {
      value: path,
      enumerable: true
    });
  });
  return `
  <config>
    {
      usingComponents: ${JSON.stringify(components, null, 2)}
    }
  </config>
  `;
};

/**
 * 匹配最外层花括号的位置
 * @param {String} rawString
 */
const bracketMatcherIndex = (rawString, skip = 0) => {
  const bracketCount = { left: 0, right: 0 };
  const chars = rawString.split("");

  const leftIndex = chars.findIndex(
    (() => {
      let currentCount = 0;
      return char => {
        if (char === "{") currentCount++;
        if (currentCount <= skip) return false;
        return true;
      };
    })()
  );

  const rightIndex =
    chars.slice(leftIndex).findIndex(char => {
      if (char === "{") {
        bracketCount.left++;
      } else if (char === "}") {
        bracketCount.right++;
      }
      if (
        bracketCount.left === 0 ||
        bracketCount.right === 0 ||
        bracketCount.left !== bracketCount.right
      ) {
        return false;
      }
      if (bracketCount.left <= skip + 1) return false;
      return true;
    }) + leftIndex;
  return { leftIndex: leftIndex, rightIndex: rightIndex };
};

/**
 * 匹配最外层花括号的内容
 * @param {String} rawString
 */
const bracketMatcher = rawString => {
  const { leftIndex, rightIndex } = bracketMatcherIndex(rawString);
  return rawString.slice(leftIndex, rightIndex);
};

/**
 * @param {String} scriptString
 */
const wepyClass2wepyObject = scriptString => {
  let wepyVariableName = "wepy"; // default to be `wepy`
  return scriptString
    .replace(
      /import\s+(\w+)\s+from\s+["']wepy['"]/g,
      (matchString, wepyName) => {
        wepyVariableName = wepyName;
        return `import ${wepyVariableName} from "@wepy/core"`;
      }
    )
    .replace(
      new RegExp(
        String.raw`export\s+default\s+class\s+(\w+\s+)?extends\s+${wepyVariableName}\.(\w+)(\s|\n|\r)*{(.|\n)*}`
      ),
      (match, wepyClassName, wepyClassType) => {
        const wepyObject = bracketMatcher(match);
        console.log(wepyObject);
        // const wepyObject = match.match(/{(.|\n)*}/g)[0];
        // console.log(wepyObject);
        // const newWepyObject = wepyObject.replace(
        //   /\w+\s*=\s*{(.|\n)*?};?/g,
        //   matched => {
        //     // console.log(matched);
        //     return matched.replace(/}\s*;$/, "}").replace("=", ":") + ",";
        //   }
        // );
        // return `${wepyVariableName}.${wepyClassType}(${newWepyObject})`;
      }
    );
};

const targetFile = path.resolve(
  "/Users/brucezhou/Documents/codes/GitHub/Undergraduate-develop/src/app.wpy"
);
const targetFileText = fs.readFileSync(targetFile).toString();
console.log(getUsedConfig(targetFileText));

/**
 * 选定指定成对花括号内的位置
 * @param {string} rawString
 * @param {number} skip
 */
const matchBracket = (rawString, skip = 0) => {
  const chars = rawString.split("");
  const left = chars.findIndex(
    (() => {
      let brackCount = 0;
      return char => {
        if (char === "{") {
          brackCount++;
        }
        if (brackCount <= skip) return false;
        return true;
      };
    })()
  );
  const right =
    chars.slice(left).findIndex(
      (() => {
        const bracketCount = { left: 0, right: 0 };
        return char => {
          if (char === "{") {
            bracketCount.left++;
            return;
          } else if (char === "}") {
            bracketCount.right++;
            return;
          }
          if (
            bracketCount.left === 0 ||
            bracketCount.right === 0 ||
            bracketCount.left !== bracketCount.right
          ) {
            return false;
          }
          return true;
        };
      })()
    ) + left;
  return { left, right };
};
