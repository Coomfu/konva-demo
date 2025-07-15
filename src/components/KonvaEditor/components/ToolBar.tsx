import {
  AimOutlined,
  BgColorsOutlined,
  DeleteOutlined,
  ExpandOutlined,
  HighlightOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { Button, Select, Slider } from "antd";
import { useContext } from "react";
import classNames from "classnames";
import Konva from "konva";
import EditorContext from "../hooks/Context";
import { getExpandRect, getNewScalePoint } from "../utils/utils";
import {
  EXPAND_RATIO_OPTIONS,
  EXPAND_TIMES_OPTIONS,
  VIEWPORT_SIZE_OPTIONS,
  ZOOM_SCALE_MIN,
  ZOOM_SCALE_OPTIONS,
} from "../utils/const";

const ToolBar = () => {
  const {
    viewportSize,
    setViewportSize,
    historyManager,
    setZoomScale,
    zoomScale = 1,
    stageRef,
    cursor,
    setCursor,
    selectedIds,
    selectedLayer,
    transformerRef,
    editState,
    setEditState,
    editLayerRef,
    imagesCache
  } = useContext(EditorContext);

  const onChangeCursor = (cursor: "default" | "pen" | "select" | "expand") => {
    if (cursor === "expand" || cursor === "pen") {
      const nodes = transformerRef?.current?.nodes();
      const stage = stageRef?.current;
      if (!stage || !nodes || !nodes.length) return;
      const node = nodes[0];
      const { width, height, x, y } = node.getClientRect();
      let newScale = zoomScale;
      if (width * zoomScale * 2.333 > stage.width() || height * zoomScale * 2.333 > stage.height()) {
        newScale = Math.max(
          Math.min(
            (stage.width() * 0.4) / width,
            (stage.height() * 0.4) / height
          ),
          ZOOM_SCALE_MIN
        );
      }
      
      setZoomScale?.(newScale);
      const scaleRatio = newScale / zoomScale;
      const newPoint = {
        x:
          (stage.x() - x) * scaleRatio +
          (stage.width() - width * scaleRatio) / 2,
        y:
          (stage.y() - y) * scaleRatio +
          (stage.height() - height * scaleRatio) / 2,
      };

      new Konva.Tween({
        node: stage,
        duration: 0.4,
        scaleX: newScale,
        scaleY: newScale,
        x: newPoint.x,
        y: newPoint.y,
        easing: Konva.Easings.EaseInOut,
      }).play();

      if (cursor === 'expand') {
        setEditState?.({
          expandRatio: "original",
          expandRatioLabel: "原始比例",
          expandTimes: 1.5,
          expandWidthTimes: 1.5,
          expandHeightTimes: 1.5,
        });
      } else if (cursor === 'pen') {
        setEditState?.({
          tool: 'brush',
          penWidth: 5,
          lines: [],
        });
      }
    }

    setCursor?.(cursor);
  };

  const onChangeZoomScale = (scale: number) => {
    const stage = stageRef?.current;
    if (!stage || !zoomScale) return;

    setZoomScale?.(scale);

    const newPos = getNewScalePoint(stage, scale);
    new Konva.Tween({
      node: stage,
      duration: 0.4,
      scaleX: scale,
      scaleY: scale,
      x: newPos.x,
      y: newPos.y,
      easing: Konva.Easings.EaseInOut,
    }).play();
  };

  const onExpand = () => {
    const stage = stageRef?.current;
    const editLayer = editLayerRef?.current;
    if (!stage || !editLayer || !selectedLayer) return;

    const scale = stage.scaleX();
    const { width: expandWidth, height: expandHeight } = getExpandRect(
      selectedLayer,
      editState?.expandRatio,
      editState?.expandTimes
    );
    // const { width, height, cropWidth, cropHeight } = selectedLayer;

    const visibleWidth = expandWidth * scale;
    const visibleHeight = expandHeight * scale;

    // const ratioX = cropWidth / width;
    // const ratioY = cropHeight / height;

    // const pixelRatio = Math.max(ratioX, ratioY) / scale; // 变回原图尺寸
    const pixelRatio = 1 / scale // 产品说跟画布上图片分辨率保持一致 

    const png = editLayer.toDataURL({
      mimeType: "image/png",
      width: visibleWidth,
      height: visibleHeight,
      x: stage.width() / 2 - visibleWidth / 2,
      y: stage.height() / 2 - visibleHeight / 2,
      pixelRatio,
    });
    const a = document.createElement("a");
    a.href = png;
    a.download = "export.png";
    a.click();
  };

  const onCutOut = () => {
    if (!selectedLayer) return;

    const cv = window.cv;
    const imageElement = imagesCache?.[selectedLayer.imgSrc];
    const width = imageElement?.width || 0;
    const height = imageElement?.height || 0;
    const { cropWidth = 0, cropHeight = 0, width: layerWidth = 0, height: layerHeight = 0, cropX = 0, cropY = 0 } = selectedLayer;
    // const ratio = Math.max(cropWidth / layerWidth, cropHeight / layerHeight);
    const ratio = 1;
    if (!imageElement || !cv) return;

    const offsetX = (selectedLayer?.x || 0)
    const offsetY = (selectedLayer?.y || 0)
  
    // 1. 准备两个 mask canvas
    const brushCanvas = document.createElement('canvas');
    const eraserCanvas = document.createElement('canvas');
    brushCanvas.width = eraserCanvas.width = layerWidth;
    brushCanvas.height = eraserCanvas.height = layerHeight;
    const brushCtx = brushCanvas.getContext('2d')!;
    const eraserCtx = eraserCanvas.getContext('2d')!;
  
    // 填黑背景，准备白色路径
    [brushCtx, eraserCtx].forEach(ctx => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'white';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    });

    for (const line of editState?.lines || []) {
      const ctx = line.tool === 'brush' ? brushCtx : line.tool === 'eraser' ? eraserCtx : null;
      if (!ctx) continue;
      ctx.beginPath();
      const pts = line.points;
      ctx.moveTo((pts[0] - offsetX) * ratio + cropX, (pts[1] - offsetY) * ratio + cropY);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo((pts[i] - offsetX) * ratio + cropX, (pts[i + 1] - offsetY) * ratio + cropY);
      }
      ctx.lineWidth = line.penWidth * ratio;
      ctx.stroke();
    }

    // 4. 用 OpenCV 相减 mask
    const brushMask = cv.imread(brushCanvas);
    const eraserMask = cv.imread(eraserCanvas);
    const brushGray = new cv.Mat();
    const eraserGray = new cv.Mat();
    cv.cvtColor(brushMask, brushGray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(eraserMask, eraserGray, cv.COLOR_RGBA2GRAY);
    cv.threshold(brushGray, brushGray, 127, 255, cv.THRESH_BINARY);
    cv.threshold(eraserGray, eraserGray, 127, 255, cv.THRESH_BINARY);
    const finalMask = new cv.Mat();
    cv.subtract(brushGray, eraserGray, finalMask);
  
    // 5. 读取原图并添加透明 alpha
    const imageMat = cv.imread(imageElement);
    const dsize = new cv.Size(layerWidth, layerHeight);
    const resized = new cv.Mat();
    cv.resize(imageMat, resized, dsize, 0, 0, cv.INTER_LINEAR);
    const rgba = new cv.Mat();
    cv.cvtColor(resized, rgba, cv.COLOR_RGB2RGBA);
  
    // 6. 应用 mask 到 alpha 通道（mask=255 → alpha=0）
    for (let y = 0; y < finalMask.rows; y++) {
      for (let x = 0; x < finalMask.cols; x++) {
        const maskVal = finalMask.ucharPtr(y, x)[0];
        if (maskVal === 255) {
          rgba.ucharPtr(y, x)[3] = 0; // 设置为透明
        }
      }
    }
  
    // 7. 截取 crop 区域（最终输出图像）
    const cropRect = new cv.Rect(cropX, cropY, cropWidth / width * layerWidth, cropHeight / height * layerHeight);
    const cropped = rgba.roi(cropRect);

    // 8. 显示或导出结果
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = layerWidth;
    outputCanvas.height = layerHeight;
    cv.imshow(outputCanvas, cropped);

    const finalDataURL = outputCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = finalDataURL;
    a.download = 'cutout.png';
    a.click();

    // 9. 释放资源
    [brushMask, eraserMask, brushGray, eraserGray, finalMask, imageMat, rgba, cropped].forEach(mat => mat.delete());
  }

  return (
    <div className="tool-bar">
      <div className="flex-center-center">
        <Select
          options={VIEWPORT_SIZE_OPTIONS}
          value={`${viewportSize?.width}x${viewportSize?.height}`}
          onChange={(value) => {
            setViewportSize?.({
              width: Number(value.split("x")[0]),
              height: Number(value.split("x")[1]),
            });
          }}
        />
        <div
          className={classNames("tool-bar-item", {
            "tool-bar-item-disabled": !historyManager?.hasUndo,
          })}
          onClick={() => {
            if (!historyManager?.hasUndo) return;
            historyManager?.undo();
          }}
        >
          <RollbackOutlined />
        </div>
        <div
          className={classNames("tool-bar-item", {
            "tool-bar-item-disabled": !historyManager?.hasRedo,
          })}
          onClick={() => {
            if (!historyManager?.hasRedo) return;
            historyManager?.redo();
          }}
        >
          <RollbackOutlined style={{ transform: "rotate(180deg)" }} />
        </div>
        ｜
        <div
          className={classNames("tool-bar-item", {
            "tool-bar-item-selected": cursor === "default",
          })}
          onClick={() => onChangeCursor("default")}
        >
          <AimOutlined />
        </div>
        <div
          className={classNames("tool-bar-item", {
            "tool-bar-item-selected": cursor === "pen",
          })}
          onClick={() => onChangeCursor("pen")}
        >
          <HighlightOutlined />
        </div>
        {selectedIds && selectedIds.length === 1 && (
          <div
            className={classNames("tool-bar-item", {
              "tool-bar-item-selected": cursor === "expand",
            })}
            onClick={() => onChangeCursor("expand")}
          >
            <ExpandOutlined />
          </div>
        )}
        <Select
          value={zoomScale || 1}
          onSelect={onChangeZoomScale}
          options={ZOOM_SCALE_OPTIONS}
        />
      </div>

      {cursor === "expand" && (
        <div className="flex-center-center">
          {editState?.expandRatio === "original" && (
            <Select
              value={editState.expandTimes}
              options={EXPAND_TIMES_OPTIONS}
              onSelect={(times: number) => {
                setEditState?.((s) => ({
                  ...s,
                  expandTimes: times,
                  expandWidthTimes: times,
                  expandHeightTimes: times,
                }));
              }}
            ></Select>
          )}
          {EXPAND_RATIO_OPTIONS.map((item) => (
            <div
              className={classNames("tool-bar-item", {
                "tool-bar-item-selected":
                  editState?.expandRatioLabel === item.label,
              })}
              key={item.value}
              onClick={() => {
                setEditState?.((s) => ({
                  ...s,
                  expandRatio: item.value,
                  expandRatioLabel: item.label,
                }));
              }}
            >
              {item.label}
            </div>
          ))}
          <Button type="primary" onClick={onExpand}>
            1 扩图
          </Button>
        </div>
      )}
      {cursor === "pen" && (
        <div className="flex-center-center">
          <div
            className={classNames("tool-bar-item", {
              "tool-bar-item-selected": editState?.tool === "brush",
            })}
            onClick={() =>
              setEditState?.((s) => ({
                ...s,
                tool: "brush",
              }))
            }
          >
            <BgColorsOutlined />
          </div>
          <div
            className={classNames("tool-bar-item", {
              "tool-bar-item-selected": editState?.tool === "eraser",
            })}
            onClick={() =>
              setEditState?.((s) => ({
                ...s,
                tool: "eraser",
              }))
            }
          >
            <DeleteOutlined />
          </div>
          <Slider
            style={{ width: 100 }}
            min={1}
            max={30}
            value={editState?.penWidth}
            onChange={(value) =>
              setEditState?.((s) => ({
                ...s,
                penWidth: value,
              }))
            }
          ></Slider>
          {/* 新增：抠图按钮 */}
          <Button 
            type="primary"
            onClick={onCutOut}
          >
            抠图
          </Button>
        </div>
      )}
    </div>
  );
};

export default ToolBar;
