/**
 * 将template中形如 <div @tap="handleTap({{index}})"></div>
 * 转化为 <div @tap="handleTap(index)"></div>
 */

/**
 * @param {String} rawString
 */
const resolveTagMethods = rawString => {
  return rawString.replace(
    /<template([\d\D]*?)>([\d\D]*?)<\/template>/g,
    (matchedTemplate, attribute, innnerTemplate) => {
      const newInnerTemplate = innnerTemplate.replace(
        /<(\w+)\s+([\d\D]*?)(\/?)>/g,
        (matchedTag, tagName, tagAttribute, end) => {
          const tagAttributes = tagAttribute.replace(
            /@\w+\s*=\s*['"]([\s\S]*?)['"]/g,
            matchedTagMethod => {
              return matchedTagMethod.replace(/\{\{([\d\D]*?)\}\}/g, "$1");
            }
          );
          return "<" + tagName + " " + tagAttributes + end + ">";
        }
      );
      return "<template" + attribute + ">" + newInnerTemplate + "</template>";
    }
  );
};

module.exports = resolveTagMethods;
