import React, { useContext, useState, useCallback, useMemo } from "react";
import { Stage, Layer as KonvaLayer, Rect, Shape, Line } from 'react-konva';
import Konva from 'konva';
import EditorContext from "../hooks/Context";
import LayerImage from "./LayerImage";
import { getCanvasPointer, getCanvasRect, getExpandRect, getNewScalePoint, isPointInSelectionBox, isRectOverlap } from "../utils/utils";
import Transformer from "./Transformer";
import type { DragSelection } from "../type/types";
import { PAN_STEP, ZOOM_SCALE_MAX, ZOOM_SCALE_MIN, ZOOM_SCALE_STEP } from "../utils/const";

// ===== 渲染背景网格 =====
const renderBackgroundGrid = (context: any, shape: any, zoomScale: number) => {
  let gridSize = 12;
  if (zoomScale > 1.8) gridSize = 8;
  else if (zoomScale < 1) gridSize = 18;
  else if (zoomScale < 0.6) gridSize = 36;
  
  const canvasWidth = shape.width();
  const canvasHeight = shape.height();
  
  for (let y = 0; y < canvasHeight; y += gridSize) {
    for (let x = 0; x < canvasWidth; x += gridSize) {
      const isDarkCell = (Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2 === 0;
      context.fillStyle = isDarkCell ? '#404040' : '#303030';
      context.fillRect(
        Math.round(x), 
        Math.round(y), 
        Math.ceil(gridSize) + 0.5, 
        Math.ceil(gridSize) + 0.5
      );
    }
  }
  context.fillStrokeShape(shape);
}

// ===== 主组件 =====
const Viewport: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
  const {
    viewportSize = { width: 0, height: 0 },
    containerSize,
    containerRef,
    layers = [],
    selectedIds = [],
    selectedLayer,
    setSelectedIds,
    transformerRef,
    stageRef,
    zoomScale = 1,
    setZoomScale,
    viewportPos = { x: 0, y: 0 },
    mainLayerRef,
    editLayerRef,
    imagesCache = {},
    cursor,
    editState,
  } = useContext(EditorContext);

  // ===== 状态管理 =====
  const [dragSelection, setDragSelection] = useState<DragSelection>({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  // const [isGroupDragging, setIsGroupDragging] = useState<boolean>(false);
  // const dragData = useRef<IObject<any>[]>(null);

  // ===== 框选功能 =====
  const handleStageMouseDown = useCallback((e: any) => {
    const stage = e.target.getStage();

    // 如果在不可见区域点击在选中目标内且为单选，开始拖拽
    if (selectedIds.length === 1 && e.target === stage) {
      const node = transformerRef?.current?.nodes()[0]
      const mousePos = getCanvasPointer(stage);
      if (!node || !mousePos) return;
      if (isPointInSelectionBox([node], mousePos)) {
        node?.startDrag();
        return;
      }
    }

    // 只处理点击画布的情况
    if (e.target !== stage) return;
    
    const mousePos = getCanvasPointer(stage);
    if (!mousePos) return;

    // 开始框选
    setSelectedIds?.([]);
    setDragSelection({
      visible: true,
      x: mousePos.x,
      y: mousePos.y,
      width: 0,
      height: 0,
    });
    setIsBoxSelecting(true);
  }, [selectedIds]);

  const handleStageMouseMove = useCallback((e: any) => {
    if (!isBoxSelecting) return;

    const mousePos = getCanvasPointer(e.target.getStage());
    if (!mousePos) return;
    
    setDragSelection(prev => ({
      ...prev,
      width: mousePos.x - prev.x,
      height: mousePos.y - prev.y
    }));
  }, [isBoxSelecting]);

  const handleStageMouseUp = useCallback(() => {
    // // 结束组拖拽
    // if (isGroupDragging) {
    //   endGroupDrag();
    //   return;
    // }

    // 结束框选
    if (!isBoxSelecting) return;

    setIsBoxSelecting(false);
    setDragSelection(prev => ({ ...prev, visible: false }));
    // 没有框选，直接返回
    if (dragSelection.width === 0 || dragSelection.height === 0) return;

    // 检测框选的图层
    const newSelectedLayerIds: string[] = [];
    layers.filter(layer => layer.visible).forEach(layer => {
      const layerNode = stageRef?.current?.findOne(`#${layer.id}`);
      const selectionNode = stageRef?.current?.findOne('#selection-rect');
      
      if (!layerNode || !selectionNode) return;

      const selectionBounds = getCanvasRect(selectionNode);
      const layerBounds = getCanvasRect(layerNode);
      if (isRectOverlap(selectionBounds, layerBounds)) {
        newSelectedLayerIds.push(layer.id);
      }
    });
    
    setSelectedIds?.(newSelectedLayerIds);
  }, [isBoxSelecting, layers, dragSelection]);

  const handleStageMouseLeave = useCallback(() => {
    if (!isBoxSelecting) return;
    setIsBoxSelecting(false);
    setDragSelection(prev => ({ ...prev, visible: false }));
  }, [isBoxSelecting]);

  // 组拖拽会破坏zindex，暂时只允许clip外单选拖动
  // // ===== 组拖拽功能 =====
  // const startGroupDrag = useCallback(() => {
  //   const stage = stageRef?.current;
  //   if (!stage) return false;
    
  //   const mousePos = getCanvasPointer(stage);
  //   if (!mousePos) return false;
    
  //   const selectedNodes = transformerRef?.current?.nodes();

  //   if (!selectedNodes || !isPointInSelectionBox(selectedNodes, mousePos)) return false;

  //   setIsGroupDragging(true);
    
  //   // 创建临时组进行拖拽
  //   const parentLayer = selectedNodes[0].getLayer();
  //   const tempGroup = new Konva.Group();
  //   parentLayer?.add(tempGroup);
    
  //   selectedNodes.forEach(node => {
  //     tempGroup.add(node as any);
  //   });
  //   dragData.current = selectedNodes.map(node => JSON.parse(node.toJSON()).attrs);
  //   updateLayers?.(selectedNodes.map(node => node.attrs) || []);

  //   stage.draw();
  //   tempGroup.startDrag();
  //   return true;
  // }, []);

  // const endGroupDrag = useCallback(() => {
  //   setIsGroupDragging(false);

  //   const selectedNodes = transformerRef?.current?.nodes();
  //   if (!selectedNodes?.length) return;
    
  //   const parentLayer = selectedNodes[0].getLayer();
  //   const tempGroup = selectedNodes[0].getParent();
    
  //   // 更新节点位置并移出组
  //   selectedNodes.forEach(node => {
  //     const absolutePosition = getCanvasAbsolutePosition(node);
  //     node.setAttrs({
  //       x: absolutePosition.x,
  //       y: absolutePosition.y,
  //     });
  //     parentLayer?.add(node as any);
  //   });
  //   updateLayers?.(selectedNodes.map(node => node.attrs) || []);
  //   historyManager?.addAction('changeNode', {
  //     preNodes: dragData.current,
  //     nextNodes: selectedNodes.map(node => JSON.parse(node.toJSON()).attrs),
  //   });
    
  //   tempGroup?.destroy();
  //   parentLayer?.draw();
  // }, []);

  const handleZoom = useCallback((e: any, stage: Konva.Stage) => {
    const oldScale = zoomScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * ZOOM_SCALE_STEP : oldScale / ZOOM_SCALE_STEP;
    const clampedScale = Number(Math.max(ZOOM_SCALE_MIN, Math.min(ZOOM_SCALE_MAX, newScale)).toFixed(2));
    
    setZoomScale?.(clampedScale);
    
    // 计算缩放中心点
    const newPos = getNewScalePoint(stage, clampedScale, pointer);
    stage.position(newPos);
    stage.scale({ x: clampedScale, y: clampedScale });
  }, [zoomScale, setZoomScale]);

  const handlePan = useCallback((e: any, stage: Konva.Stage) => {
    const currentStagePos = stage.position();
    const scale = stage.scaleX();
    
    // 限制最大最小值
    const minX = (-viewportPos?.x - viewportSize?.width) * scale;
    const maxX = minX + stage.width() + viewportSize?.width * scale;
    const minY = (-viewportPos?.y - viewportSize?.height) * scale;
    const maxY = minY + stage.height() + viewportSize?.height * scale;


    const newStagePos = {
      x: Math.max(
        Math.min(currentStagePos.x - e.evt.deltaX * PAN_STEP, maxX),
        minX
      ),
      y: Math.max(
        Math.min(currentStagePos.y - e.evt.deltaY * PAN_STEP, maxY),
        minY
      ),
    };

    stage.position(newStagePos);
  }, [viewportPos, viewportSize]);

  // ===== 缩放和平移功能 =====
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();

    if (cursor !== 'default') return;
    
    const stage = stageRef?.current;
    if (!stage) return;
    
    if (e.evt.ctrlKey) {
      // 缩放模式
      handleZoom(e, stage);
    } else {
      // 平移模式
      handlePan(e, stage);
    }
  }, [zoomScale, setZoomScale, handlePan, handleZoom, cursor]);

  // ===== 主渲染 =====
  return (
    <div ref={containerRef} className="viewport-container" style={style}>
      <Stage
        ref={stageRef}
        width={containerSize?.width}
        height={containerSize?.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onWheel={handleWheel}
      >
        {/* 主内容层 */}
        <KonvaLayer
          ref={mainLayerRef}
          clipX={viewportPos?.x}
          clipY={viewportPos?.y}
          clipWidth={viewportSize?.width || 512}
          clipHeight={viewportSize?.height || 512}
        >
          {/* 背景透明网格 */}
          <Shape
            x={viewportPos?.x}
            y={viewportPos?.y}
            width={viewportSize?.width || 512}
            height={viewportSize?.height || 512}
            listening={false}
            perfectDrawEnabled={false}
            sceneFunc={(context, shape) => renderBackgroundGrid(context, shape, zoomScale)}
          />
          
          {/* 图层内容 */}
          {layers.map((layer) => (
            <LayerImage key={layer.id} {...layer} image={imagesCache[layer.imgSrc]} />
          ))}
        </KonvaLayer>

        {/* UI 层 */}
        <KonvaLayer>
          {/* 遮罩层 & 扩图框 */}
          {cursor !== 'default' && selectedLayer && <>
            <Rect
              x={viewportPos.x - (stageRef?.current?.width() || 0) * ZOOM_SCALE_MAX}
              y={viewportPos.y - (stageRef?.current?.height() || 0) * ZOOM_SCALE_MAX}
              width={((stageRef?.current?.width() || 0) * ZOOM_SCALE_MAX + viewportSize?.width) * ZOOM_SCALE_MAX}
              height={((stageRef?.current?.height() || 0) * ZOOM_SCALE_MAX + viewportSize?.height) * ZOOM_SCALE_MAX}
              fill="rgba(0, 0, 0, 0.5)"
            />
            {cursor === 'expand' && editState && <Rect
              {...getExpandRect(selectedLayer, editState.expandRatio, editState.expandTimes)}
              stroke="#479ff8"
              strokeWidth={5}
            ></Rect>}
          </>}

          {/* 框选矩形 */}
          {dragSelection.visible && (
            <Rect
              id="selection-rect"
              x={dragSelection.x}
              y={dragSelection.y}
              width={dragSelection.width}
              height={dragSelection.height}
              fill="rgba(0, 150, 255, 0.1)"
              stroke="rgba(0, 150, 255, 0.8)"
              strokeWidth={1}
            />
          )}

          {/* 变换控制器 */}
          <Transformer  />
        </KonvaLayer>

        {/* 编辑层，单独一层方便导出 */}
        {cursor !== 'default' && selectedLayer && (
          <KonvaLayer ref={editLayerRef}>
            <LayerImage {...selectedLayer} image={imagesCache[selectedLayer.imgSrc]} />
          </KonvaLayer>
        )}

        {cursor === 'pen' && <KonvaLayer>
          {editState?.lines?.map((line: any, i: number) => (
            <Line
              listening={false}
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={line.penWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === 'brush' ? 'source-over' : 'destination-out'
              }
            />
          ))} 
        </KonvaLayer>}
        
      </Stage>
    </div>
  );
};

export default Viewport;