import { useContext, useCallback, useEffect, useState, useRef } from "react";
import { Image as KonvaImage } from "react-konva";
import EditorContext from "../hooks/Context";
import KeyManager from "../utils/KeyManager";
import type { Layer, Rect, Size } from "../type/types";
import type { Image } from "konva/lib/shapes/Image";
import { getCanvasPointer } from "../utils/utils";

const LayerImage: React.FC<Layer> = (layer: Layer) => {
  const { setSelectedIds, selectedIds, transformerRef, cursor, setEditState } =
    useContext(EditorContext);

  const {
    id,
    width,
    height,
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    imgWidth,
    imgHeight,
  } = layer;

  const isMultiSelected = (transformerRef?.current?.nodes()?.length || 0) > 1;

  // 图片拖拽框宽高
  const [size, setSize] = useState<Size>({ width, height });
  // 图片包含被遮挡部分的当前宽高，当作比例尺用
  const [imageSize, setImageSize] = useState<Size>({
    width: imgWidth,
    height: imgHeight,
  });
  // 遮挡部分的属性，这个需要根据图片宽高再统一比例尺
  const [cropRect, setCropRect] = useState<Rect>({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });
  const isDrawing = useRef(false);

  const imageRef = useRef<Image>(null);

  const handleTransform = () => {
    const node = imageRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newWidth = Math.min(Math.max(20, Number((node.width() * scaleX).toFixed(4))), 1024);
    const newHeight = Math.min(Math.max(20, Number((node.height() * scaleY).toFixed(4))), 1024);

    node.scaleX(1);
    node.scaleY(1);

    const anchor = transformerRef?.current?.getActiveAnchor();
    // 如果拖动四个角，那么就按比例改变
    if (
      anchor === "top-left" ||
      anchor === "top-right" ||
      anchor === "bottom-left" ||
      anchor === "bottom-right"
    ) {
      setImageSize({
        width: (newWidth / size.width) * imageSize.width,
        height: (newHeight / size.height) * imageSize.height,
      });
      node.setAttrs({
        imgWidth: (newWidth / size.width) * imageSize.width,
        imgHeight: (newHeight / size.height) * imageSize.height,
      });
    } else {
      // 拖动四条边
      const image = layer.image;
      const aspectRatio = newWidth / newHeight;
      const imageRatio = image.width / image.height;

      let newCropWidth = cropRect.width || image.width;
      let newCropHeight = cropRect.height || image.height;
      let newCropX = cropRect.x;
      let newCropY = cropRect.y;

      // 宽变大
      if (newWidth > imageSize.width) {
        setImageSize({ width: newWidth, height: newWidth / imageRatio });
        node.setAttrs({
          imgWidth: newWidth,
          imgHeight: newWidth / imageRatio,
        });
        newCropWidth = image.width;
        newCropHeight = image.width / aspectRatio;
        newCropX = 0;
        newCropY = newCropY + (cropRect.height - newCropHeight) / 2; // 实际cropHeight是越变越小
      } else if (newWidth < imageSize.width) {
        // 宽缩小
        if (anchor === "middle-left") {
          // 拖的左边
          newCropWidth = (newWidth / imageSize.width) * image.width;
          newCropX = newCropX - newCropWidth + cropRect.width;
        } else if (anchor === "middle-right") {
          newCropWidth = (newWidth / imageSize.width) * image.width;
          // 拖右边时，如果宽度不够了，就要先把newCropX减到0
          if (newCropWidth + newCropX > image.width) {
            newCropX = newCropX - (newCropWidth + newCropX - image.width);
          }
        }
      }

      // 高变大
      if (newHeight > imageSize.height) {
        setImageSize({ height: newHeight, width: newHeight * imageRatio });
        node.setAttrs({
          imgWidth: newHeight * imageRatio,
          imgHeight: newHeight,
        });
        newCropWidth = image.height * aspectRatio;
        newCropHeight = image.height;
        newCropY = 0;
        newCropX = newCropX + (cropRect.width - newCropWidth) / 2;
      } else if (newHeight < imageSize.height) {
        // 高缩小
        if (anchor === "top-center") {
          // 拖的上边
          newCropHeight = (newHeight / imageSize.height) * image.height;
          newCropY = newCropY - newCropHeight + cropRect.height;
        } else if (anchor === "bottom-center") {
          newCropHeight = (newHeight / imageSize.height) * image.height;
          if (newCropHeight + newCropY > image.height) {
            console.log('xjf', newCropHeight + newCropY > image.height)
            newCropY = newCropY - (newCropHeight + newCropY - image.height);
          }
        }
      }

      newCropX = Math.max(0, newCropX);
      newCropY = Math.max(0, newCropY);


      setCropRect({
        x: newCropX,
        y: newCropY,
        width: newCropWidth,
        height: newCropHeight,
      });
    }

    setSize({
      width: newWidth,
      height: newHeight,
    });
  };

  const handleSelect = useCallback(() => {
    if (KeyManager.shiftKey) {
      // Shift + 点击：切换选择状态
      if (selectedIds?.includes(layer.id)) {
        setSelectedIds?.(selectedIds.filter((id) => id !== layer.id));
      } else {
        setSelectedIds?.([...(selectedIds || []), layer.id]);
      }
    } else {
      // 普通点击：如果是多选状态且当前已选中，保持多选；否则单选
      if (selectedIds?.includes(layer.id) && selectedIds.length > 1) {
        return; // 保持当前多选状态
      }
      setSelectedIds?.([layer.id]);
    }
  }, [selectedIds, setSelectedIds, layer.id]);

  const handleDragStart = useCallback(
    (e) => {
      // 多选时不响应单独拖动
      if (!isMultiSelected) {
        return;
      }
      // 确保拖动时元素被选中
      handleSelect();
    },
    [isMultiSelected, handleSelect]
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (cursor === 'pen') {
        isDrawing.current = true;
        const mousePos = getCanvasPointer(e.target.getStage());
        setEditState?.((s) => ({
          ...s,
          lines: [...(s.lines || []), { tool: s.tool, points: [mousePos.x, mousePos.y], penWidth: s.penWidth }],
        }));
        return;
      }

      // 多选时不响应单独点击
      if (isMultiSelected) {
        return;
      }

      e.cancelBubble = true; // 阻止事件冒泡到 Stage
      handleSelect(); // 立即选中并显示 Transformer
    },
    [isMultiSelected, handleSelect, cursor]
  );

  const handleMouseMove = useCallback((e: any) => {
    if (isDrawing.current && cursor === 'pen') {
      const stage = e.target.getStage();
      const mousePos = getCanvasPointer(stage);
    
      setEditState?.(s => {
        // To draw line
        const lines = s.lines;
        const lastLine = lines[lines.length - 1];
        // add point
        lastLine.points = lastLine.points.concat([mousePos.x, mousePos.y]);

        // replace last
        lines.splice(lines.length - 1, 1, lastLine);
        return {
          ...s,
          lines: lines.concat()
        }
      });
      return;
    }
  }, [cursor]);

  const handleMouseUp = useCallback((e: any) => {
    if (cursor === 'pen') {
      isDrawing.current = false;
      return;
    }
  }, [cursor]);

  const handleMouseLeave = useCallback((e: any) => {
    if (cursor === 'pen') {
      isDrawing.current = false;
      return;
    }
  }, [cursor]);

  useEffect(() => {
    setSize({ width, height });
    setCropRect({ x: cropX, y: cropY, width: cropWidth, height: cropHeight });
    setImageSize({ width: imgWidth, height: imgHeight });
    const node = imageRef.current;
    node?.setAttrs({
      imgWidth,
      imgHeight,
    });
  }, [layer]);

  return (<>
    <KonvaImage
      {...layer}
      id={id}
      image={image}
      draggable={cursor === 'default' ? true : false}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
      onDragMove={() => {}}
      onDragEnd={() => {}}
      onTransform={handleTransform}
      ref={imageRef}
      width={size.width}
      height={size.height}
      cropX={cropRect.x}
      cropY={cropRect.y}
      cropWidth={cropRect.width}
      cropHeight={cropRect.height}
    />
  </>);
};

export default LayerImage;
