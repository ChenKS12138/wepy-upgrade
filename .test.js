const path = require("path");
const fs = require("fs");

const targetFile = path.resolve(
  "/Users/brucezhou/Documents/codes/GitHub/Undergraduate-develop/src/pages/index.wpy"
);
const targetFileText = fs.readFileSync(targetFile).toString();

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
 * @param {string} rawString
 */
const parseImports = rawString => {
  const importPattern = /import\s*([\w\-\_]*)\s*from\s*['"]([\w\-\_\.\/\@]*)['"];*/gi;
  const importArray = rawString.match(importPattern) || [];
  return importArray.map(rawImport => {
    const path = rawImport
      .match(/from\s+["'].*?["'];?/g)[0]
      .replace(/(\s|;|'|"|\.(wpy|vue))/g, "")
      .slice(4);
    const variable = rawImport
      .match(/import\s+(\{|\s|\w|\}|,)*?\s/g)[0]
      .replace(/\s/g, "")
      .slice(6);
    return { path, variable };
  });
};

/**
 * 选定指定成对中|花括号内的位置
 * @param {string} rawString
 * @param {number} skip
 */
const matchBracket = (rawString, skip = 0) => {
  const chars = rawString.split("");
  const left = chars.findIndex(
    (() => {
      let brackCount = 0;
      return char => {
        if (["{", "["].includes(char)) {
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
          if (["{", "["].includes(char)) {
            bracketCount.left++;
            return;
          } else if (["}", "]"].includes(char)) {
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

/**
 * 处理wepy文件
 * @param {string} rawWepyFileText
 */
const processWepyFileText = rawWepyFileText => {
  const configTag = { usingComponets: {}, config: {} };
  const handledScript = rawWepyFileText.replace(
    /<script>(.|\n)*?<\/script>/g,
    matchedScriptText => {
      let wepyVariable = "wepy"; // 默认为 "wepy"
      let innerMatchedScriptText = matchedScriptText.slice(
        9,
        matchedScriptText.length - 9
      );

      // 处理 import wepy from 'wepy';
      innerMatchedScriptText = innerMatchedScriptText.replace(
        /import\s+(\w+)\s+from\s+["']wepy["'];?/g,
        (matched, wepyVariableName) => {
          wepyVariable = wepyVariableName;
          return `import ${wepyVariableName} from "@wepy/core"`;
        }
      );

      // 处理 export default class xxx extentds xxx
      innerMatchedScriptText = (function() {
        let exportOffset;
        let wepyObjectType;
        innerMatchedScriptText = innerMatchedScriptText.replace(
          new RegExp(
            String.raw`export\s+default\s+class\s+(\w+\s+)?extends\s+${wepyVariable}\.(\w+)`
          ),
          (matched, p1, p2, offset) => {
            exportOffset = offset;
            wepyObjectType = p2;
            return `${wepyVariable}.${p2}`;
          }
        );
        const wepyObjectString = innerMatchedScriptText
          .split("")
          .slice(exportOffset)
          .reduce(
            (prev, current) => {
              if (current === "{") {
                prev.bracketStack.push("{");
              } else if (current === "(") {
                prev.bracketStack.push("(");
              }
              const bracketCount = prev.bracketStack.filter(x => x === "{")
                .length;

              if (bracketCount === 1) {
                if (
                  current === "=" &&
                  prev.bracketStack[prev.bracketStack.length - 1] === "{"
                ) {
                  prev.result += ":";
                } else if (current === ";") {
                  prev.result += "";
                } else if (current === "{") {
                  prev.result += "({";
                } else if (current === "}") {
                  prev.result += "})";
                } else if (current === "]") {
                  prev.result += "],";
                } else if (current === "[") {
                  prev.result += "[";
                } else {
                  prev.result += current;
                }
              } else if (bracketCount === 2) {
                if (current === "}") {
                  prev.result += "},";
                } else {
                  prev.result += current;
                }
              } else if (bracketCount !== 0) {
                prev.result += current;
              }

              if (
                current === ")" &&
                prev.bracketStack[prev.bracketStack.length - 1] === "("
              ) {
                prev.bracketStack.pop();
              } else if (
                current === "}" &&
                prev.bracketStack[prev.bracketStack.length - 1] === "{"
              ) {
                prev.bracketStack.pop();
              }
              return prev;
            },
            { result: "", bracketStack: [] }
          ).result;
        // 处理 config 和 components
        let deepth = 0;
        let tempKeyString = "";
        const resultObject = {};

        // 处理注释
        const wepyObjectStringWithoutComment = removeCodeComments(
          wepyObjectString
        ).replace(/\r|\n|\s/g, "");
        wepyObjectStringWithoutComment.split("").forEach((char, charIndex) => {
          if (["{", "["].includes(char)) {
            deepth++;
          }

          if (deepth === 1) {
            if (![":", ",", "{", "}"].includes(char)) {
              tempKeyString += char;
            }
          }
          if (deepth === 2) {
            if (["{", "["].includes(char)) {
              const { right } = matchBracket(
                wepyObjectStringWithoutComment.substr(charIndex)
              );
              Reflect.defineProperty(resultObject, tempKeyString, {
                value: wepyObjectStringWithoutComment.substr(charIndex, right),
                enumerable: true
              });
              tempKeyString = "";
            }
          }

          if (["}", "]"].includes(char)) {
            deepth--;
          }
        });
        // 处理 config
        configTag.config = new Function(`return ${resultObject.config}`)();

        // 处理 components
        const imports = parseImports(innerMatchedScriptText);
        const componentsString = String(resultObject.components || "");
        configTag.usingComponets = componentsString
          .substring(1, componentsString.length - 1)
          .split(",")
          .reduce((prev, item) => {
            const [key, value] = item.split(":");
            const importVariableName = value || key;
            const { path, variable } = imports.find(
              x => x.variable === importVariableName
            ) || { path: "", variable: "" };
            Reflect.defineProperty(prev, variable, {
              value: path,
              enumerable: true
            });
            return prev;
          }, {});
        return (
          innerMatchedScriptText.slice(0, exportOffset) +
          "\n" +
          `${wepyVariable}.${wepyObjectType}(${wepyObjectString})`
        );
      })();

      return `<script>${innerMatchedScriptText}</script>`;
    }
  );
  return (
    handledScript +
    "\n" +
    `
<config>
  ${JSON.stringify(configTag, null, 2)}
</config>
`
  );
};

console.log(processWepyFileText(targetFileText));
