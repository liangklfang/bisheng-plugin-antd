## 1.jsonML格式
如下是html内容：
```html
<ul>
    <li style="color:red">First Item</li>
    <li title="Some hover text." style="color:green">
    Second Item
    </li>
    <li><span class="code-example-third">Third</span>
    Item</li>
</ul>
```

下面是解析出来的jsonML内容：
```json
["ul",
//每一个标签都是一个数组，数组中第一个元素是标签名，第二个元素是属性名，第三个是子元素
    ["li",
        { "style" : "color:red" },
        "First Item"
    ],
    //第一个元素也是一个数组
    ["li",
        {
        "title" : "Some hover text.",
        "style" : "color:green"
        },
        "Second Item"
    ],
    //第二个元素也是一个数组
    ["li",
        ["span",
        { "class" : "code-example-third" },
        "Third"
        ],
        " Item"
    ]
    //第三个元素也是一个数组
]
```

## 2.bisheng-plugin-antd中对于markdown部分的语法要求
 
 注意：这里所说的语法要求，其实就是按照一定的规则来解析出我们需要的node阶段~

### 2.1 中文介绍`节点node`

```js
  function getChineseIntroStart(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      JsonML.getChildren(node)[0] === 'zh-CN'
  );
}
```

注意：中文部分的`node`内容要满足以下的条件：

  首先：content内容部分

  然后：该node的tagName为'h2'

  最后：该node的第一个元素为'zh-CN'

### 2.2 英文介绍`节点node`

```js
function getEnglishIntroStart(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      JsonML.getChildren(node)[0] === 'en-US'
  );
}
```

英文部分的内容要满足以下的条件：

  首先：content内容部分

  然后：该node的tagName为'h2'

  最后：该node的第一个元素为'en-US'

### 2.3 代码部分`节点node`

```js
function getCodeIndex(contentChildren) {
  return contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'pre' &&
      JsonML.getAttributes(node).lang === 'jsx'
  );
}
```

code部分满足一下条件:

  首先：content内容部分

  然后：该node的tagName为'pre'

  最后：该node的attribute中的lang为'jsx'

  `注意：在这个plugin中，我们的中文部分结束在最前面，英文部分次之，我们的代码部分是最后的~`

### 2.4 该plugin对于markdownData内容的修改

他会为我们的markdownData对象添加`content,highlightedCode（来自于bisheng-plugin-highlighted）,preview,hightlightedStyle（来自于bisheng-plugin-highlighted）,style，src(如果meta配置了iframe那么要在cwd/_site下写入demo页面)`等属性。同时默认还要meta,toc等属性。其中带有前缀的属性比如hightlightedStyle和highlightedCode都是通过bisheng-plugin-highlighted进行处理后得到的。

添加markdownData.content部分：

```js
  const codeIndex = getCodeIndex(contentChildren);
  //得到code标签下标
  const introEnd = codeIndex === -1 ? contentChildren.length : codeIndex;
  //如果有代码部分，那么结束就是代码部分index，否则就是content部分的子元素的长度
  if (chineseIntroStart > -1 ) {
    markdownData.content = {
      'zh-CN': contentChildren.slice(chineseIntroStart + 1, englishIntroStart),
      'en-US': contentChildren.slice(englishIntroStart + 1, introEnd),
    };
  } else {
    markdownData.content = contentChildren.slice(0, introEnd);
  }
```

如果有中文介绍，那么英文介绍以前都是`zh-CN`部分，这部分对于ant design页面的页头部分，因此没有code代码，而剩下的部分都是英文介绍（`因为中英文的介绍code部分都是公用的`）。

获取code部分的内容：

```js
 const codeIndex = getCodeIndex(contentChildren);
 //得到子元素pre标签的下标
 const sourceCodeObject = getSourceCodeObject(contentChildren, codeIndex);
 function getCode(node) {
  return JsonML.getChildren(
    JsonML.getChildren(node)[0]//code标签
  )[0];
}
//得到code标签中的内容
function getSourceCodeObject(contentChildren, codeIndex) {
  if (codeIndex > -1) {
    return {
      isES6: true,
      code: getCode(contentChildren[codeIndex]),
    };
  }
  return {
    isTS: true,
    //TypeScript,因为我们的codeIndex是通过获取属性为jsx的pre标签得到的
  };
}
```

所以，到这里我们就获取到的code标签其中的内容了

为我们的markdown这个文件树jsonML添加`markdownData.highlightedCode`,`markdownData.preview`属性：

```js
  if (sourceCodeObject.isES6) {
    //表示有我们的pre标签包裹的代码
    markdownData.highlightedCode = contentChildren[codeIndex].slice(0, 2);
    //contentChildren[codeIndex]内容见output/index.js,通过bisheng-plugin-hightlighted处理后我们的pre标签的属性中已经含有了pre标签的code内容经过高亮处理后的代码了，把它作为 markdownData.highlightedCode属性
    markdownData.preview = utils.getPreview(sourceCodeObject.code);
    //这是获取到真实内容，没有高亮显示过！
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
```

其中highlightedCode在Demo这个组件中是如下展示：

```html
 <div className="highlight">
   {props.utils.toReactComponent(highlightedCode)}
   //所以hightedCode表示的是收缩展开的代码内容,我们上面已经封装到了markdownData中了，其内容就是pre标签中code标签内容经过高亮处理后的结果(但是包括语言和属性)
</div>
```

我们看看markdownData.preview的内容：

```jsx
'use strict';
const path = require('path');
const pkgPath = path.join(process.cwd(), 'package.json');
const pkgName = require(pkgPath).name;
//项目名称
const componentsPath = path.join(process.cwd(), 'components');
//sourceCode就是原生的pre标签下的code标签的内容
exports.getPreview = function getPreview(sourceCode) {
 //传入的是pre标签下的code
  const preview = [
    'pre', { lang: '__react' },
  ];
  preview.push([
    'code',
    sourceCode.replace(`${pkgName}/lib`, componentsPath),
    //把code标签内部的`${pkgName}/lib`修改为'cwd/components'
  ]);
  return preview;
};
```

所以，*这里我们的preview其实就是添加了我们的pre标签和code标签，其中code标签的内容是没有highlighted的内容(从原始markdownData获取)，code标签内的文件路径被修改了。所有preview本身也是一个对象。而且必须要注意，这里的lang都转化为了__react,这会在我们的bisheng-plugin-react中的jsonml-react-loader中进一步处理，变成可以实际展示的组件*。

我们看看在Demo组件中是如何对我们的preview进行处理的：

```jsx
 if(!this.liveDemo){
    this.liveDemo=meta.iframe ? <iframe src={src}\/> : preview(React, ReactDOM);
 }
```

但是上面的markdown.preview是一个对象，怎么会可以直接调用了，那么我给你看看上面的jsonml-react-loader中的代码：

```js
module.exports = function transformer(content, lang) {
  let imports = [];
  const inputAst = parser(content);
  traverse(inputAst, {
    ArrayExpression: function(path) {
      const node = path.node;
      const firstItem = node.elements[0];
      const secondItem = node.elements[1];
      let renderReturn;
      if (firstItem &&
        firstItem.type === 'StringLiteral' &&
        firstItem.value === 'pre' &&
        secondItem.properties[0].value.value === lang) {
        let codeNode = node.elements[2].elements[1];
        let code = codeNode.value;
        const codeAst = parser(code);
        traverse(codeAst, {
          ImportDeclaration: function(importPath) {
            imports.push(importPath.node);
            importPath.remove();
          },
          CallExpression: function(CallPath) {
            const CallPathNode = CallPath.node;
            if (CallPathNode.callee &&
              CallPathNode.callee.object &&
              CallPathNode.callee.object.name === 'ReactDOM' &&
              CallPathNode.callee.property &&
              CallPathNode.callee.property.name === 'render') {
              renderReturn = types.returnStatement(
                CallPathNode.arguments[0]
              );
              CallPath.remove();
            }
          },
        });
        const astProgramBody = codeAst.program.body;
        const codeBlock = types.BlockStatement(astProgramBody);
        // ReactDOM.render always at the last of preview method
        if (renderReturn) {
          astProgramBody.push(renderReturn);
        }
        const coceFunction = types.functionExpression(
          types.Identifier('jsonmlReactLoader'),
          [],
          codeBlock
        );
        path.replaceWith(coceFunction);
      }
    },
  });
  return {
    imports: imports,
    inputAst: inputAst,
  };
};
```

*也就是说，这个loader就是专门处理上面markdown.preview这种lang为__react的内容，同时把preivew转化为一个函数调用*！所以我们的preview会转化为如下的结构:

```js
preview:jsonmlReactLoader(){}
```

具体转化成为的代码可以参考'./output/preview.js'

如果不是ES6的code，那么我们会如下处理：
```js
    const watchLoader = path.join(__dirname, './loader/watch');
    //添加一个loader
    function getCorrespondingTSX(filename) {
      return path.join(process.cwd(), filename.replace(/\.md$/i, '.tsx'));
    }
   //把.md的文件后缀修改为'.tsx',也就是typeScript代码
   {
    const requireString = `require('!!babel!${watchLoader}!${getCorrespondingTSX(meta.filename)}')`;
    markdownData.highlightedCode = {
      __BISHENG_EMBEDED_CODE: true,
      code: `${requireString}.highlightedCode`,//code是经过loader处理过的
    };
    markdownData.preview = {
      __BISHENG_EMBEDED_CODE: true,
      code: `${requireString}.preview`,
    };
  }
```

我们再来看看watchLoader代码：
```js
'use strict';
const ts = require('typescript');
const generator = require('babel-generator').default;
const transformer = require('bisheng-plugin-react/lib/transformer');
const utils = require('../utils');
//处理typeScript
module.exports = function watch(tsCode) {
  if (this.cacheable) {
    this.cacheable();
  }
  const es6Code = ts.transpileModule(tsCode, {
    //tsCode是一个文件路径
    compilerOptions: {
      jsx: 'preserve',
      target: 'es6'
    },
  }).outputText;
  //获取TypeScript编译后的代码
  const highlightedCode = {
    es6: Prism.highlight(es6Code, Prism.languages.jsx),
    ts: Prism.highlight(tsCode, Prism.languages.typescript),
  };
  const preprocessedCode = JSON.stringify(utils.getPreview(es6Code));
  const res = transformer(preprocessedCode, '__react');
  //手动让transformer处理转化为函数，那么typescrpt也可以调用
  const preview = generator(res.inputAst, null, preprocessedCode).code;
  res.inputAst.program.body = res.imports;
  const imports = generator(res.inputAst, null, preprocessedCode).code;
  return `${imports}\n` +
    'module.exports = {\n' +
    `  highlightedCode: ${JSON.stringify(highlightedCode)},\n` +
    `  preview: ${preview.replace(/;$/, '')}` +
    '\n}';
}
```

如果是TypeScript也会处理成含有higlightedCode和preview属性的对象。[Prism文档](https://github.com/benjycui/node-prismjs)

接下来就是获取markdownData.style和hightlightedStyle表示内联的css样式：
```jsx
    function isStyleTag(node) {
      return node && JsonML.getTagName(node) === 'style';
    }
    //标签名为style或者pre标签上的lang为css的Node，但是我们都是只会获取到第一个元素内容
    function getStyleNode(contentChildren) {
      return contentChildren.filter(node =>
         isStyleTag(node) ||
          (JsonML.getTagName(node) === 'pre' && JsonML.getAttributes(node).lang === 'css')
      )[0];
    }
  // Add style node to markdown data.
  const styleNode = getStyleNode(contentChildren);
  if (isStyleTag(styleNode)) {
    //如果标签本身是style标签那么我们封装到markdownData.style上
    markdownData.style = JsonML.getChildren(styleNode)[0];
  } else if (styleNode) {
    //如果标签本身不是style标签
    const styleTag = contentChildren.filter(isStyleTag)[0];
    //那么我们获取content中第一个style标签
    markdownData.style = getCode(styleNode) + (styleTag ? JsonML.getChildren(styleTag)[0] : '');
    markdownData.highlightedStyle = JsonML.getAttributes(styleNode).highlighted;
    //highlightedStyle就是为了原样显示的部分，所以是通过JsonML处理过的，而style是直接插入的
  }
```

如果我们的第一个css样式(包括pre的lang为css,或者style标签)标签本身就是`style`标签，那么我们的markdownData中的style中封装的仅仅是style标签的内容，没有其他的属性

```jsx
<style>
[id^=components-button-demo-] .ant-btn {
  margin-right: 8px;
  margin-bottom: 12px;
}
[id^=components-button-demo-] .ant-btn-group \> .ant-btn {
  margin-right: 0;
}
<\/style>
```

*如果第一个控制样式的不是style标签而是pre，那么style属性就会包括pre标签的内容和第一个style标签的内容(如果有);而highlightedStyle只会包含pre标签的内容，因为他是通过bisheng-plugin-highlighted进行对pre标签的处理的*。但是我们只会关注第一个pre标签和style标签(具体还没有想明白)

```jsx
      {
            highlightedStyle ?
              <div key="style" className="highlight">
                <pre>
                  <code className="css" dangerouslySetInnerHTML={{ __html: highlightedStyle }} />
                </pre>
              </div> :
              null
          }
```

这里的highlightedStyle是原样显示的css内容,而markdownData.style是直接作为style的内容插入的，是为了控制页面的真实显示样式的：

```jsx
     <section className="code-box-demo">
          {this.liveDemo}
          {
            style ?
              <style dangerouslySetInnerHTML={{ __html: style }} /> :
              null
          }
    <\/section>
```

我们继续往下分析：
```jsx
const babelrc = {
  presets: ['es2015', 'react'].map(m =>
     require.resolve(`babel-preset-${m}`)
  ),
};
const tmpl = fs.readFileSync(path.join(__dirname, 'template.html')).toString();
  if (meta.iframe) {
    const html = nunjucks.renderString(tmpl, {
      id: meta.id,
      //meta.id = meta.filename.replace(/\.md$/, '').replace(/\//g, '-');这个id作为页面中这个div的id的值
      style: markdownData.style,
      //style标签的内容，或者<pre class="css"/>的内容加上第一个style标签的内容。用于页面样式控制的css
      script: babel.transform(getCode(markdownData.preview), babelrc).code,
      //获取preview中的code内容,其中code代码是没有经过hightlighted高亮处理的代码，并经过babel处理并作为内联的script插入
    });
    const fileName = `demo-${Math.random()}.html`;
    fs.writeFile(path.join(process.cwd(), '_site', fileName), html);
    //在_site目录下写一个文件名随机的preview页面html
    markdownData.src = path.join('/', fileName);
    //同时添加src
  }
```

获取`node_modules/bisheng-plugin-antd`这个插件的template.html文件,如果meta中配置了iframe，那么我们要进行特殊的处理。*我们首先在cwd下的_site目录下写一个html文件，同时在markdownData的src属性中保存这个src目录，这个文件就是预览页面*。html模板内容如下：
```html
<!DOCTYPE html>
<html>
  <head>
    <title>Demo</title>
    <link rel="stylesheet" href="../index.css" />
    <link rel="stylesheet" href="../index-1.css" />
    <link rel="stylesheet" href="../index-2.css" />
    <style>
      html, body {
        height: 100%;
        margin: 0;
        background: none;
      }
      {{ style }}
    </style>
  </head>
  <body>
    <div id="{{ id }}" class="code-box-demo"></div>
    <script>
      function require(module) {
        if (module === 'react-router') {
          return window.ReactRouter;
        }
        return window.parent[module];
      }
      var mountNode = document.getElementById('{{ id }}');
      //被插入的节点
    </script>
    <script src="https://unpkg.com/react/dist/react.js"></script>
    <script src="https://unpkg.com/react-dom/dist/react-dom.js"></script>
    <script src="https://unpkg.com/react-router/umd/ReactRouter.js"></script>
    <script>
      {{ script }}
    </script>
  </body>
</html>
```

总之，`该插件就是为我们的markdownData添加highlightedCode,content,preview,style,highlightedStyle，src等属性，都是通过文件树的jsonML解析得到的`。其中内联的script得到的内容是如下的样式:

```js
  'use strict';
var _reactRouter = require('react-router');
var _antd = require('antd');
var Apps = function Apps() {
  return React.createElement(
    'ul',
    { className: 'app-list' },
    React.createElement(
      'li',
      null,
      React.createElement(
        _reactRouter.Link,
        { to: '/apps/1' },
        'Application1'
      ),
      '\uFF1A',
      React.createElement(
        _reactRouter.Link,
        { to: '/apps/1/detail' },
        'Detail'
      )
    ),
    React.createElement(
      'li',
      null,
      React.createElement(
        _reactRouter.Link,
        { to: '/apps/2' },
        'Application2'
      ),
      '\uFF1A',
      React.createElement(
        _reactRouter.Link,
        { to: '/apps/2/detail' },
        'Detail'
      )
    )
  );
};

var Home = function Home(_ref) {
  var routes = _ref.routes,
      params = _ref.params,
      children = _ref.children;
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { className: 'demo-nav' },
      React.createElement(
        _reactRouter.Link,
        { to: '/' },
        'Home'
      ),
      React.createElement(
        _reactRouter.Link,
        { to: '/apps' },
        'Application List'
      )
    ),
    children || 'Home Page',
    React.createElement(_antd.Alert, { style: { margin: '16px 0' }, message: 'Click the navigation above to switch:' }),
    React.createElement(_antd.Breadcrumb, { routes: routes, params: params })
  );
};
ReactDOM.render(React.createElement(
  _reactRouter.Router,
  { history: _reactRouter.hashHistory },
  React.createElement(
    _reactRouter.Route,
    { name: 'home', breadcrumbName: 'Home', path: '/', component: Home },
    React.createElement(
      _reactRouter.Route,
      { name: 'apps', breadcrumbName: 'Application List', path: 'apps', component: Apps },
      React.createElement(
        _reactRouter.Route,
        { name: 'app', breadcrumbName: 'Application:id', path: ':id' },
        React.createElement(_reactRouter.Route, { name: 'detail', breadcrumbName: 'Detail', path: 'detail' })
      )
    )
  )
), mountNode);
```

所以说我们最后会在项目的_site目录下生产很多的demo页面并使用iframe来显示：
![](./demos.png)

不过我们上面分析的是一个process-demo文件，我们还有一个文件对markdown文件的API部分进行处理，也就是如下部分：
![](./api.png)

我们接下来分析另外一个文件，也就是说当页面的文件路径filename没有'/demo'部分的时候就会经过下面的文件处理：
```js
const JsonML = require('jsonml.js/lib/utils');
//markdownData里面传入的jsonML,也就是文件内容通过mark-twain处理过了
module.exports = (markdownData) => {
  const contentChildren = JsonML.getChildren(markdownData.content);
  const apiStartIndex = contentChildren.findIndex(node =>
     JsonML.getTagName(node) === 'h2' &&
      /^API/.test(JsonML.getChildren(node)[0])
  );
  //API部分也是通过'h2'标签来分割的，同时内容是'API'
  if (apiStartIndex > -1) {
    const content = contentChildren.slice(0, apiStartIndex);
    markdownData.content = ['section'].concat(content);
    const api = contentChildren.slice(apiStartIndex);
    markdownData.api = ['section'].concat(api);
    //如果不是demo页面，那么我们在API前面的都是markdownData.content而余下的部分是api
  }
  return markdownData;
};
```

至于什么是demo页面，我们看看如下的图片,其实际上表示的就是我们在一个页面中显示的的内容,可以折叠展开的部分：
[process-demo and process-doc](./demo.png)

所以，`process-doc其实就是当页面中没有demo的时候我们做的特殊处理，其在API前面的都是content，剩下的部分就是API部分`。

### 1.5插件在bisheng-plugin-antd/lib/browser中做的修改

```html
import React from 'react';
import { Link } from 'react-router';
import toReactComponent from 'jsonml-to-react-component';
import JsonML from 'jsonml.js/lib/utils';
import VideoPlayer from './VideoPlayer';
import ImagePreview from './ImagePreview';
<!--h1-h6表示的就是标题head-->
function isHeading(node) {
  return /h[1-6]/i.test(JsonML.getTagName(node));
}
function generateSluggedId(children) {
  const headingText = children.map((node) => {
    if (JsonML.isElement(node)) {
      if (JsonML.hasAttributes(node)) {
        return node[2] || '';
      }
      return node[1] || '';
    }
    return node;
  }).join('');
  <!--获取所有的h1-h6标签的内容-->
  const sluggedId = headingText.trim().replace(/\s+/g, '-');
 <!--所有标题的内容的空格使用'-'替换-->
  return sluggedId;
}
// export default doesn't work
module.exports = () =>
   ({
     converters: [
       [node => JsonML.isElement(node) && isHeading(node), (node, index) => {
         const children = JsonML.getChildren(node);
        <!--获取标题内容-->
         const sluggedId = generateSluggedId(children);
         <!--获取标题的文件的内容-->
         return React.createElement(JsonML.getTagName(node), {
           key: index,
           id: sluggedId,<!--id是文件的内容-->
           ...JsonML.getAttributes(node),<!--得到所有的属性-->
         }, [
            <!--这里是元素的子元素-->
           <span key="title">{children.map(child => toReactComponent(child))}<\/span>,
           <a href={`#${sluggedId}`} className="anchor" key="anchor">#<\/a>,
         ]);
       }],
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'video', (node, index) =>
        <!--如果是video，那么使用VideoPlayer-->
         <VideoPlayer video={JsonML.getAttributes(node)} key={index} \/>,
       ],
       <!--a标签同时又href，同时以http开头-->
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'a' && !(
        JsonML.getAttributes(node).class ||
          (JsonML.getAttributes(node).href &&
           JsonML.getAttributes(node).href.indexOf('http') === 0) ||
          \/^#\/.test(JsonML.getAttributes(node).href)
      ), (node, index) =>
        <Link to={JsonML.getAttributes(node).href} key={index}>{toReactComponent(JsonML.getChildren(node)[0])}<\/Link>,
       ],
       [node =>
         JsonML.isElement(node) &&
          JsonML.getTagName(node) === 'p' &&
          JsonML.getTagName(JsonML.getChildren(node)[0]) === 'img' &&
          \/preview-img\/gi.test(JsonML.getAttributes(JsonML.getChildren(node)[0]).class),
          <!--p标签下含有img图片，同时class有‘preview-image’-->
         (node, index) => {
           const imgs = JsonML.getChildren(node)
                .filter(img => JsonML.isElement(img) && Object.keys(JsonML.getAttributes(img)).length > 0)
                .map(img => JsonML.getAttributes(img));
                <!--使用ImagePreview-->
           return <ImagePreview imgs={imgs} key={index} \/>;
         }],
     ],
   })
```

首先，和我们的所有的插件一样也是返回一个converters数组，然后根据不同node选择实例化不同的组件。