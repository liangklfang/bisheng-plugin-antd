import React from 'react';
import { Link } from 'react-router';
import toReactComponent from 'jsonml-to-react-component';
import JsonML from 'jsonml.js/lib/utils';
import VideoPlayer from './VideoPlayer';
import ImagePreview from './ImagePreview';
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
  const sluggedId = headingText.trim().replace(/\s+/g, '-');
  return sluggedId;
}
// export default doesn't work
module.exports = () =>
   ({
     converters: [
       [node => JsonML.isElement(node) && isHeading(node), (node, index) => {
         const children = JsonML.getChildren(node);
         const sluggedId = generateSluggedId(children);
         return React.createElement(JsonML.getTagName(node), {
           key: index,
           id: sluggedId,
           ...JsonML.getAttributes(node),
         }, [
           <span key="title">{children.map(child => toReactComponent(child))}<\/span>,
           <a href={`#${sluggedId}`} className="anchor" key="anchor">#<\/a>,
         ]);
       }],
       [node => JsonML.isElement(node) && JsonML.getTagName(node) === 'video', (node, index) =>
         <VideoPlayer video={JsonML.getAttributes(node)} key={index} \/>,
       ],
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
          //p标签，但是其第一个子元素是img标签，同时img标签含有的class含有'preview-img'值
         (node, index) => {
           const imgs = JsonML.getChildren(node)
                .filter(img => JsonML.isElement(img) && Object.keys(JsonML.getAttributes(img)).length > 0)
                .map(img => JsonML.getAttributes(img));
           //注意：这里传递的都是所有的img标签的属性，所以是一个对象数组
           return <ImagePreview imgs={imgs} key={index} \/>;
         }],
     ],
   })
;
