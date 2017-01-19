const path = require('path');
const processDoc = require('./process-doc');
const processDemo = require('./process-demo');

/*
 (1)markdownData里面传入的jsonML,也就是文件内容通过mark-twain处理过了
 (2)如果文件路径有demo部分，那么使用processDemo组件，否则使用processDoc组件（比如我们在temp下写入的markdown文件都是会通过这个loader进行处理的）
*/
module.exports = (markdownData, _, isBuild) => {
  const isDemo = /\/demo$/i.test(path.dirname(markdownData.meta.filename));
  if (isDemo) {
    return processDemo(markdownData, isBuild);
  }
  return processDoc(markdownData);
};
