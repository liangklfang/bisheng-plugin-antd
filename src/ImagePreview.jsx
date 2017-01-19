import React from 'react';
import classNames from 'classnames';
import Modal from 'antd/lib/modal';
import Carousel from 'antd/lib/carousel';

//\b表示单词的边界
function isGood(className) {
  return /\bgood\b/i.test(className);
}
//\b表示单词的边界
function isBad(className) {
  return /\bbad\b/i.test(className);
}

/*
(1)实例化组件如下：
       <PreviewImageBox
          style={style}
          comparable={comparable}
          previewVisible={this.state.leftVisible}
          cover={imagesList[0]}
          coverMeta={imgsMeta[0]}
          imgs={imagesList}
          onClick={this.handleLeftClick}
          onCancel={this.handleCancel}
        />
*/
function PreviewImageBox({
  cover, coverMeta, imgs, style, previewVisible,
  comparable, onClick, onCancel
}) {
  const onlyOneImg = comparable || imgs.length === 1;
  //如果只有一个图片
  return (
    <div className="preview-image-box"
      style={style}
    >
      <div onClick={onClick} className={`preview-image-wrapper ${coverMeta.isGood && 'good'} ${coverMeta.isBad && 'bad'}`}>
        <img className={coverMeta.className} src={coverMeta.src} alt={coverMeta.alt} />
      </div>
      <div className="preview-image-title">{coverMeta.alt}</div>
      <div className="preview-image-description"
        dangerouslySetInnerHTML={{ __html: coverMeta.description }}
      />
       {/*这里是一个弹窗*/}
      <Modal className="image-modal" width={960} visible={previewVisible} title={null} footer={null}
        onCancel={onCancel}
      >
       {/*这里是一个旋转木马*/}
        <Carousel className={`${onlyOneImg ? 'image-modal-single' : ''}`} draggable={!onlyOneImg} adaptiveHeight>
          {comparable ? cover : imgs}
        </Carousel>
        <div className="preview-image-title">{coverMeta.alt}</div>
      </Modal>
    </div>
  );
}



export default class ImagePreview extends React.Component {
  constructor(props) {
    super(props);
    //左右切换不可见
    this.state = {
      leftVisible: false,
      rightVisible: false,
    };
    this.handleLeftClick = this.handleClick.bind(this, 'left');
    this.handleRightClick = this.handleClick.bind(this, 'right');
  }
 
 //让左侧或者右侧可见
  handleClick(side) {
    this.setState({ [`${side}Visible`]: true });
  }
  //恢复左右不可见
  handleCancel = () => {
    this.setState({
      leftVisible: false,
      rightVisible: false,
    });
  }
/*
(1)实例化方式如下：
 const imgs = JsonML.getChildren(node)
        .filter(img => JsonML.isElement(img) && Object.keys(JsonML.getAttributes(img)).length > 0)
        .map(img => JsonML.getAttributes(img));
   return <ImagePreview imgs={imgs} key={index} \/>;
  JsonML.getAttributes(img)

(2)getAttributes方法的源码

  //hasAttributes方法
  const hasAttributes = exports.hasAttributes = function hasAttributes(jml) {
    if (!isElement(jml)) {
      throw new SyntaxError('invalid JsonML');
    }
    return isAttributes(jml[1]);//第一个元素是属性
  };

//isAttributes源码
const isAttributes = exports.isAttributes = function isAttributes(jml) {
  return !!jml && typeof jml === 'object' && !isArray(jml);
};

//getAttributes方法
 const getAttributes = exports.getAttributes = function getAttributes(jml, addIfMissing) {
  if (hasAttributes(jml)) {
    return jml[1];
  }

  if (!addIfMissing) {
    return {};
  }

  // need to add an attribute object
  const name = jml.shift();
  const attr = {};
  jml.unshift(attr);
  jml.unshift(name || '');
  return attr;
};

*/
  render() {
    const { imgs } = this.props;
    //获取实例化ImagePreview时候传入的props
    const imgsMeta = imgs.map((img) => {
      const { alt, description, src } = img;
      const imgClassName = img.class;
      //或者img的class属性
      return {
        className: imgClassName,
        alt, description, src,
        isGood: isGood(imgClassName),
        //className是否含有good
        isBad: isBad(imgClassName),
      };
    });

    const imagesList = imgsMeta.map((meta, index) => {
      const metaCopy = { ...meta };
      //获取每一个属性和值
      delete metaCopy.description;
      delete metaCopy.isGood;
      delete metaCopy.isBad;
      //移除我们的description,isGood,isBad防止传递给react组件抛出错误
      return (
        <div key={index}>
          <div className="image-modal-container">
            <img {...metaCopy} alt={meta.alt} />
          </div>
        </div>
      );
    });
    //这里返回的DOM是包含了所有的image显示DOM的数组
    const comparable = imgs.length === 2 &&
            (imgsMeta[0].isGood || imgsMeta[0].isBad) &&
            (imgsMeta[1].isGood || imgsMeta[1].isBad);
    //长度是2，那么宽度是50%
    const style = comparable ? { width: '50%' } : null;

    const hasCarousel = imgs.length > 1 && !comparable;
    //如果image的个数多余1，同时不可比，那么添加'preview-image-boxes-with-carousel'
    const previewClassName = classNames({
      'preview-image-boxes': true,
      clearfix: true,
      'preview-image-boxes-with-carousel': hasCarousel,
    });
    return (
      <div className={previewClassName}>
        <PreviewImageBox
          style={style}
          comparable={comparable}
          previewVisible={this.state.leftVisible}
          cover={imagesList[0]}
          coverMeta={imgsMeta[0]}
          imgs={imagesList}
          onClick={this.handleLeftClick}
          onCancel={this.handleCancel}
        />
        {
          //实例化右侧PreviewImageBox
          comparable ?
            <PreviewImageBox
              style={style}
              comparable
              previewVisible={this.state.rightVisible}
              cover={imagesList[1]}
              coverMeta={imgsMeta[1]}
              imgs={imagesList}
              onClick={this.handleRightClick}
              onCancel={this.handleCancel}
            /> : null
        }
      </div>
    );
  }
}
