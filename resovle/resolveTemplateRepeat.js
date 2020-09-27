/**
 * 假定所有的repeat的子标签只有一个
 */
/**
 * @param {String} rawString 
 */
const resolveTemplateRepeat = rawString => {
  return rawString.replace(/<template(.|\n)*>(.|\n)*<\/template>/g,matchedTemplateText => {
    const innnerStart = matchedTemplateText.indexOf(">") + 1;
    const innnerEnd = matchedTemplateText.lastIndexOf("<") - 1;
    const tagAttributeText = matchedTemplateText.substring(9, innnerStart - 1);
    const innerText = matchedTemplateText.substring(innnerStart, innnerEnd);
    const repeatPattern = /<repeat([\d\D]*?)>([\d\D]*?)<\/repeat>/;
    const newInnerText = innerText.replace(repeatPattern,(matchedText,attribute,inner) => {
      const attributes = attribute.trim().split(' ').reduce((prev,current) => {
        const [key,...valueArray] = current.split('=');
        const value = valueArray.join('');
        prev[key] = value;
        return prev;
      },{});
      // process.exit(0)
    })
    return `
<template${tagAttributeText}>
  ${newInnerText}
</template>
`;
  })
}

module.exports = resolveTemplateRepeat;