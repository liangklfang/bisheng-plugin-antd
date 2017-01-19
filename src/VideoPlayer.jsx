import React from 'react';
import SublimeVideo from 'react-sublime-video';

/*
(1)这里的代码是如下处理的：
  <VideoPlayer video={JsonML.getAttributes(node)} key={index} \/>
  其中实例化这个组件的时候会传入video标签的所有的属性
*/
export default function VideoPlayer({ video }) {
  const { alt, description, src } = video;
  const videoClassName = video.class;
  //获取video的class
  return (
    <div className={`preview-image-box ${videoClassName}`}>
      <div className={'preview-image-wrapper'}>
        <SublimeVideo src={src} type="video/mp4" loop/>
      </div>
      <div className="preview-image-title">{alt}</div>
      <div className="preview-image-description"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
}
