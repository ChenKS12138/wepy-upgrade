const path = require("path");
const fs = require("fs");

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
 * 处理wepy文件的script部分
 * @param {string} rawWepyFileText
 */
const processWepyScriptText = rawWepyFileText => {
  let configTag = {};
  const handledScript = rawWepyFileText.replace(
    /<script>[\d\D]*?<\/script>/g,
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
          return `import ${wepyVariableName} from "@wepy/core";`;
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
          .replace(/\w+\.\$apply\(\);?/g, "") // 替换所有this.$apply();
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
              } else if (
                bracketCount === 2 &&
                !prev.bracketStack.includes("(")
              ) {
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
        let tempKeyString = "";
        const wepyObject = {};
        const bracketStack = [];

        wepyObjectString.split("").forEach((char, charIndex) => {
          if (["{", "[", "("].includes(char)) {
            bracketStack.push(char);
          }

          const bracketStackString = bracketStack.toString();
          if (
            !bracketStackString.startsWith("(,{,{") &&
            !bracketStackString.startsWith("(,{,[")
          ) {
            if ([":", ")", "]"].includes(char)) {
              if (tempKeyString.length) {
                const { right } = matchBracket(
                  wepyObjectString.substr(charIndex)
                );
                if (char === ")") {
                  tempKeyString += ")";
                } else if (char === "]") {
                  tempKeyString += "]";
                }

                const processedTempKeyString = tempKeyString.trim().split("\n");

                Reflect.defineProperty(
                  wepyObject,
                  processedTempKeyString[
                    processedTempKeyString.length - 1
                  ].trim(),
                  {
                    value: wepyObjectString.substr(charIndex + 1, right - 1),
                    enumerable: true
                  }
                );
              }
              tempKeyString = "";
            } else if (
              tempKeyString.length ||
              !["(", "{", ",", "}", ")", " ", "\n"].includes(char)
            ) {
              tempKeyString += char;
            }
          }

          if (["}", "]", ")"].includes(char)) {
            bracketStack.pop();
          }
        });

        // 处理 components
        const imports = parseImports(innerMatchedScriptText);
        const componentsString = String(
          wepyObject.components ? wepyObject.components.trim() : ""
        );
        const importVariableNames = [];
        const tempComponents = componentsString
          .substring(1, componentsString.length - 1)
          .replace(/\/\/[\d\D]*?\n/g, "")
          .replace(/\/\*[\d\D]*?\*\//g, "")
          .split(",")
          .reduce((prev, item) => {
            const [key, value] = item.split(":");
            const componentsName = (key || "").trim().replace(/["']/g, "");
            const importVariableName = (value || key || "").trim();
            const importItem = imports.find(
              x => x.variable === importVariableName
            );
            importVariableNames.push(importVariableName);
            importItem &&
              Reflect.defineProperty(prev, componentsName, {
                value: importItem.path,
                enumerable: true
              });
            return prev;
          }, {});
        Object.keys(tempComponents).length &&
          (configTag.usingComponents = tempComponents);

        // 处理 config
        const restConfig = new Function(`return ${wepyObject.config}`)();
        configTag = { ...configTag, ...restConfig };

        // 去除import中对component的引用
        const newImportString = importVariableNames.reduce((prev, current) => {
          return prev.replace(
            new RegExp(String.raw`import\s+${current}\s+from(.|\n)*?\n`),
            ""
          );
        }, innerMatchedScriptText.substring(0, exportOffset));

        const wepyPropertys = {
          toExclude: ["constructor", "config", "components"], // 需要被过滤的属性
          notPutInMethods: [
            "globalData",
            "onLaunch",
            "mixins",
            "data",
            "computed",
            "watch",
            "methods",
            "events",
            "onLoad",
            "onShow",
            "onPullDownRefresh",
            "props"
          ] // 不会被放置到methods中
        };
        const newWepyObject = Object.entries(wepyObject).reduce(
          (prev, [key, value]) => {
            const processedKey = key.replace(/\((.|\n)*?\)/g, "");
            if (wepyPropertys.toExclude.includes(processedKey)) return prev;
            if (
              wepyPropertys.notPutInMethods.some(keyWord =>
                new RegExp(String.raw`${keyWord}`).test(
                  processedKey.replace(/async\s*/g, "")
                )
              )
            ) {
              if (key === "methods") {
                value = value.substring(
                  value.indexOf("{") + 1,
                  value.lastIndexOf("}") - 1
                );
              }
              prev[key] = value;
            } else {
              prev.toPutInMethods +=
                (!/,[\n\s\r]*?$/.test(prev.toPutInMethods) &&
                prev.toPutInMethods.length
                  ? ",\n"
                  : "") +
                key +
                (/\((.|\n)*\)/.test(key) ? "" : ":") +
                value;
            }
            return prev;
          },
          {
            toPutInMethods: ""
          }
        );
        newWepyObject.methods =
          "{" +
          (newWepyObject.methods || "\n") +
          (newWepyObject.methods && newWepyObject.toPutInMethods ? "," : "") +
          "\n" +
          (newWepyObject.toPutInMethods || "\n") +
          "}";
        Reflect.deleteProperty(newWepyObject, "toPutInMethods");

        const newWepyObjectString = Object.entries(newWepyObject).reduce(
          (prev, [key, value]) => {
            if (!key || !key.length) return prev;
            value = value.trim();
            return (prev +=
              (prev.length && !/,[\n\s\r]*?$/.test(prev.methods) ? ",\n" : "") +
              key +
              (/\((.|\n)*?\)/.test(key) ? "" : ":") +
              "\n" +
              value +
              "\n");
          },
          ""
        );

        return (
          newImportString +
          "\n" +
          `${wepyVariable}.${wepyObjectType}({\n${newWepyObjectString}})`
        );
      })();

      return `<script>
${innerMatchedScriptText}
</script>`;
    }
  );
  return (
    handledScript +
    `
<config>
  ${JSON.stringify(configTag, null, 2)}
</config>
`
  );
};

module.exports = processWepyScriptText;
