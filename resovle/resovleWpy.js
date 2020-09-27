const resolveCore = require("./resovleCore");
const resolvePug = require("./resovlePug");
const resolveStylus = require("./resovleStylus");
const resolvePathAlias = require("./resolvePathAlias");
const resovleTagMethods = require("./resovleTagMethods");
const resolveRepairImageTag = require("./resolveRepairImageTag");
const resolveTemplateRepeat = require("./resolveTemplateRepeat");

const plugins = [
  {
    pattern: /<template\s+lang\s*=\s*["']pug["']/,
    resolver: resolvePug,
  },
  {
    pattern: /<style\s+lang\s*=\s*["']stylus["']/,
    resolver: resolveStylus,
  },
  {
    pattern: /<image/,
    resolver: resolveRepairImageTag,
  },
  {
    // 用于处理usingComponents中的路径别名的问题
    pattern: /["']@\//,
    resolver: resolvePathAlias,
  },
  {
    pattern: /<template/,
    resolver: resovleTagMethods,
  },
  {
    pattern: /<repeat/,
    resolver: resolveTemplateRepeat,
  },
];

/**
 * @param {String} rawString
 */
const resolveWpy = (rawString, filePath, rootPath) => {
  const resolvers = plugins.reduce(
    (prev, current) => {
      if (current.pattern.test(rawString)) {
        prev.push(current.resolver);
      }
      return prev;
    },
    [resolveCore]
  );
  return resolvers.reduce((prev, current) => {
    return current(prev, filePath, rootPath);
  }, rawString);
};

module.exports = resolveWpy;
