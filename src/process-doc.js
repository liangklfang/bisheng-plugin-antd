const JsonML = require('jsonml.js/lib/utils');

/*
(1)markdownData里面传入的jsonML,也就是文件内容通过mark-twain处理过了，是在我们的markdown-loader中处理的。
(2)注意，这里必须要弄清楚，我们的markdown是分为两个部分的，第一个部分就是仅仅用于我们的demo部分的markdown，而另外一个就是
   就是我们的主页，分为API部分和'代码演示'以前的部分。
*/
module.exports = (markdownData) => {
  const contentChildren = JsonML.getChildren(markdownData.content);
  const apiStartIndex = contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      /^API/.test(JsonML.getChildren(node)[0])
  );
  if (apiStartIndex > -1) {
    const content = contentChildren.slice(0, apiStartIndex);
    markdownData.content = ['section'].concat(content);

    const api = contentChildren.slice(apiStartIndex);
    markdownData.api = ['section'].concat(api);
  }
  return markdownData;
};
