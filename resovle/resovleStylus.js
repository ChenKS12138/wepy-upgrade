const { converter } = require("stylus-converter");

/**
 * 处理style标签
 * @param {String} rawString
 */
const processStyleTag = rawString => {
  return rawString.replace(
    /<style[\s\S]*?>[\s\S]*?<\/style>/g,
    matchedStyleText => {
      const innnerStart = matchedStyleText.indexOf(">") + 1;
      const innnerEnd = matchedStyleText.lastIndexOf("<") - 1;
      let tagAttributeText = matchedStyleText.substring(6, innnerStart - 1);

      // 处理styls标签内部
      let newInnerText = String(
        converter(matchedStyleText.substring(innnerStart, innnerEnd))
      );

      if (/lang\d*=\d*['"]stylus["']/.test(tagAttributeText)) {
        newInnerText = newInnerText.replace(
          /\$([\w\-\_]+?)\s*:\s*([\d|\D]*?);?\n/g,
          "@$1 : $2;\n"
        );
        tagAttributeText = tagAttributeText.replace("stylus", "less");
      }

      return `<style${tagAttributeText}>
      ${newInnerText}
      </style>`;
    }
  );
};

module.exports = processStyleTag;
