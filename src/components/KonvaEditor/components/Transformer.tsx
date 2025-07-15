import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Transformer as KonvaTransformer } from "react-konva";
import EditorContext from "../hooks/Context";
import type Konva from "konva";
import type { IObject } from "../type/types";
import useImage from "use-image";
import sync from '../../../assets/ic_sync.svg'

const Transformer = () => {
  const {
    transformerRef,
    selectedIds = [],
    stageRef,
    updateLayers,
    historyManager,
    cursor
  } = useContext(EditorContext);
  const dragData = useRef<IObject<any>[]>(null);

  const handleTransformStart = useCallback(() => {
    const dragNodes = transformerRef?.current?.nodes();
    if (!dragNodes || !dragNodes.length) return;
    dragData.current = dragNodes.map((node) => JSON.parse(node.toJSON()).attrs);
    updateLayers?.(dragNodes.map((node) => node.attrs) || []);
  }, []);

  const handleTransformEnd = useCallback(() => {
    const dragNodes = transformerRef?.current?.nodes();
    if (!dragNodes || !dragNodes.length) return;
    historyManager?.addAction("changeNode", {
      preNodes: dragData.current,
      nextNodes: dragNodes.map((node) => JSON.parse(node.toJSON()).attrs),
    });
    dragData.current = null;
    updateLayers?.(dragNodes.map((node) => node.attrs) || []);
  }, []);

  // ===== 选择状态同步 =====
  useEffect(() => {
    if (transformerRef?.current) {
      const selectedNodes = selectedIds
        .map((id) => stageRef?.current?.findOne(`#${id}`))
        .filter((node): node is Konva.Node => node !== undefined);

      transformerRef.current.nodes(selectedNodes);
    }
  }, [selectedIds]);

  const [icon] = useImage(sync); // 图片路径
  const setRotateAnchor = useMemo(() => {
    return (anchor: any) => {
      if (!anchor.hasName('rotater')) return;
    
      anchor.cornerRadius(50); // 圆角
    
      // 设置icon
      anchor.scale({ x: 2, y: 2 });
      anchor.fill('#ffffff');
      anchor.fillPriority("pattern");
      anchor.fillPatternImage(icon);
      anchor.fillPatternScaleX(0.15);
      anchor.fillPatternScaleY(0.15);
      anchor.fillPatternOffsetX(-1);
      anchor.fillPatternOffsetY(-1);
      anchor.fillPatternRepeat('no-repeat');
    }
  }, [icon])

  useEffect(() => {
    if (cursor === 'expand' || cursor === 'pen') {
      transformerRef?.current?.hide();
    } else {
      transformerRef?.current?.show();
    }
  }, [cursor])

  return (
    <KonvaTransformer
      ref={transformerRef}
      onDragStart={handleTransformStart}
      onDragEnd={handleTransformEnd}
      onTransformStart={handleTransformStart}
      onTransformEnd={handleTransformEnd}
      anchorStyleFunc={setRotateAnchor}
    />
  );
};

export default Transformer;
