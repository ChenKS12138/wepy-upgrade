const pug = require("pug");

/**
 * 处理pug
 * @param {String} rawString
 */
const processTemplatePug = rawString => {
  return rawString.replace(
    /<template(.|\n)*>(.|\n)*<\/template>/g,
    matchedTemplateText => {
      const innnerStart = matchedTemplateText.indexOf(">") + 1;
      const innnerEnd = matchedTemplateText.lastIndexOf("<") - 1;
      let tagAttributeText = matchedTemplateText.substring(9, innnerStart - 1);
      let newInnerText = pug.compile(
        matchedTemplateText.substring(innnerStart, innnerEnd),
        { pretty: "  " }
      )();

      if (/lang=['"]pug['"]/.test(tagAttributeText)) {
        tagAttributeText = "";
      }
      return `
<template${tagAttributeText}>
  ${newInnerText}
</template>
      `;
    }
  );
};

module.exports = processTemplatePug;
