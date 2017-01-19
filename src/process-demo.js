const fs = require('fs');
const path = require('path');
const JsonML = require('jsonml.js/lib/utils');
const Prism = require('node-prismjs');
const nunjucks = require('nunjucks');
nunjucks.configure({ autoescape: false });

const babel = require('babel-core');
const babelrc = {
  presets: ['es2015', 'react'].map(m =>
     require.resolve(`babel-preset-${m}`)
  ),
};

const tmpl = fs.readFileSync(path.join(__dirname, 'template.html')).toString();
const watchLoader = path.join(__dirname, './loader/watch');
const utils = require('./utils');

function isStyleTag(node) {
  return node && JsonML.getTagName(node) === 'style';
}

function getCode(node) {
  return JsonML.getChildren(
    JsonML.getChildren(node)[0]
  )[0];
}


/*
(1)中文部分的内容要满足以下的条件：
  首先：content内容部分
  然后：该node的tagName为'h2'
  最后：该node的第一个元素为'zh-CN'

*/
function getChineseIntroStart(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      JsonML.getChildren(node)[0] === 'zh-CN'
  );
}


/*
(1)英文部分的内容要满足以下的条件：
  首先：content内容部分
  然后：该node的tagName为'h2'
  最后：该node的第一个元素为'en-US'
*/
function getEnglishIntroStart(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      JsonML.getChildren(node)[0] === 'en-US'
  );
}

/*
 (1)code部分满足一下条件
  首先：content内容部分
  然后：该node的tagName为'pre'
  最后：该node的attribute中的lang为'jsx'
*/
function getCodeIndex(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'pre' &&
      JsonML.getAttributes(node).lang === 'jsx'
  );
}

function getCorrespondingTSX(filename) {
  return path.join(process.cwd(), filename.replace(/\.md$/i, '.tsx'));
}

/*
(1)调用方式如下：
  const codeIndex = getCodeIndex(contentChildren);
  const sourceCodeObject = getSourceCodeObject(contentChildren, codeIndex);
*/
function getSourceCodeObject(contentChildren, codeIndex) {
  if (codeIndex > -1) {
    return {
      isES6: true,
      code: getCode(contentChildren[codeIndex]),
    };
  }
  return {
    isTS: true,
  };
}

function getStyleNode(contentChildren) {
  return contentChildren.filter(node =>
     isStyleTag(node) ||
      (JsonML.getTagName(node) === 'pre' && JsonML.getAttributes(node).lang === 'css')
  )[0];
}

/*
  (1)调用方式processDemo(markdownData, isBuild);，其中markdownData表示经过mark-twain处理后的jsonML
  (2)为我们的meta添加id，其中id就是'-'连接起来路径
*/

module.exports = (markdownData, isBuild) => {
  const meta = markdownData.meta;
  meta.id = meta.filename.replace(/\.md$/, '').replace(/\//g, '-');
  //文件名通过'-'符号连接起来，去掉其中的'/'符号
  // Should throw debugging demo while publish.
  if (isBuild && meta.debug) {
    return { meta: {} };
  }

  // Update content of demo.
  const contentChildren = JsonML.getChildren(markdownData.content);
  //获取markdown文件的内容，去除meta

  const chineseIntroStart = getChineseIntroStart(contentChildren);
  //获取中文部分

  const englishIntroStart = getEnglishIntroStart(contentChildren);
  //获取英文部分

  const codeIndex = getCodeIndex(contentChildren);
  //获取<pre lang='jsx'>的下标

  const introEnd = codeIndex === -1 ? contentChildren.length : codeIndex;
  //表示英文的最后

  //为我们的markdown的content部分添加{'zh-CN','en-US'}内容
  if (chineseIntroStart > -1 ) {
    markdownData.content = {
      'zh-CN': contentChildren.slice(chineseIntroStart + 1, englishIntroStart),
      'en-US': contentChildren.slice(englishIntroStart + 1, introEnd),
    };
  } else {
    markdownData.content = contentChildren.slice(0, introEnd);
  }
  //修正markdownData.content部分

  const sourceCodeObject = getSourceCodeObject(contentChildren, codeIndex);
  //得到pre中的code

  if (sourceCodeObject.isES6) {
    //如果有jsx代码
    markdownData.highlightedCode = contentChildren[codeIndex].slice(0, 2);
    markdownData.preview = utils.getPreview(sourceCodeObject.code);
  } else {
    const requireString = `require('!!babel!${watchLoader}!${getCorrespondingTSX(meta.filename)}')`;
    markdownData.highlightedCode = {
      __BISHENG_EMBEDED_CODE: true,
      code: `${requireString}.highlightedCode`,
    };
    markdownData.preview = {
      __BISHENG_EMBEDED_CODE: true,
      code: `${requireString}.preview`,
    };
  }

  // Add style node to markdown data.
  const styleNode = getStyleNode(contentChildren);
  if (isStyleTag(styleNode)) {
    markdownData.style = JsonML.getChildren(styleNode)[0];
  } else if (styleNode) {
    const styleTag = contentChildren.filter(isStyleTag)[0];
    markdownData.style = getCode(styleNode) + (styleTag ? JsonML.getChildren(styleTag)[0] : '');
    markdownData.highlightedStyle = JsonML.getAttributes(styleNode).highlighted;
  }

  if (meta.iframe) {
    const html = nunjucks.renderString(tmpl, {
      id: meta.id,
      style: markdownData.style,
      script: babel.transform(getCode(markdownData.preview), babelrc).code,
    });
    const fileName = `demo-${Math.random()}.html`;
    fs.writeFile(path.join(process.cwd(), '_site', fileName), html);
    markdownData.src = path.join('/', fileName);
  }

  return markdownData;
};
