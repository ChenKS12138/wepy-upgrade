const resolveRepairImageTag = rawString =>
  rawString.replace(
    /<template([\d\D]*?)>([\d\D]*?)<\/template>/,
    (matched, p1, p2) => {
      // 处理 <image>
      p2 = p2.replace(/<image([^>]*?)>/g, (imageMatched, p1, offset) => {
        if (imageMatched.endsWith("/>")) return imageMatched;
        const matchNextTag = p2
          .substring(offset + imageMatched.length)
          .match(/<([\d\D]*?)>/);
        if (
          matchNextTag &&
          matchNextTag[0] &&
          !/<\/image/.test(matchNextTag[0])
        ) {
          return imageMatched + "</image>";
        }
        return imageMatched;
      });
      // 处理 <image />
      p2 = p2.replace(/<image\s+([^>]*?)\/>/g, "<image $1></image>");
      return `<template${p1}>${p2}</template>`;
    }
  );
module.exports = resolveRepairImageTag;
