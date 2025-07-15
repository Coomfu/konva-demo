import {
  useContext,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { getId, getTarget, prefix } from "../utils/utils";
import { DATA_SCENA_ELEMENT_ID } from "../utils/const";
import EditorContext from "../utils/Context";
import type { LayerInfo, DrawingPath } from "../utils/types";
import moveableData from "../utils/MoveableData";

const brushSettings = {
  color: "#ffffff",
  size: 5,
  opacity: 1,
};

const Layer = (layer: LayerInfo & { onLoad?: () => void, children?: React.ReactNode }) => {
  const { cursor, selectedIds } = useContext(EditorContext);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const currentPathRef = useRef<DrawingPath | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 绘制所有路径到canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制所有路径
    drawingPaths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.globalAlpha = path.settings.opacity;
      ctx.strokeStyle = path.settings.color;
      ctx.lineWidth = path.settings.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 绘制路径
      const firstPoint = path.points[0];
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i];
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    });
  }, [drawingPaths]);

  // 获取鼠标/触摸位置相对于canvas的坐标
  const getEventPosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent> | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  // 开始绘制
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent> | TouchEvent) => {
      if (cursor !== "pen") return;

      e.preventDefault();
      setIsDrawing(true);

      const position = getEventPosition(e);
      const newPath: DrawingPath = {
        points: [position],
        settings: { ...brushSettings },
      };

      currentPathRef.current = newPath;
    },
    [cursor, getEventPosition]
  );

  // 绘制中
  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement, MouseEvent> | TouchEvent) => {
      if (!isDrawing || cursor !== "pen" || !currentPathRef.current) return;

      e.preventDefault();
      const position = getEventPosition(e);

      // 添加点到当前路径
      currentPathRef.current.points.push(position);

      // 实时绘制当前路径
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 重绘整个canvas
      redrawCanvas();

      // 绘制当前正在绘制的路径
      if (currentPathRef.current.points.length >= 2) {
        ctx.beginPath();
        ctx.globalAlpha = currentPathRef.current.settings.opacity;
        ctx.strokeStyle = currentPathRef.current.settings.color;
        ctx.lineWidth = currentPathRef.current.settings.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const points = currentPathRef.current.points;
        const firstPoint = points[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < points.length; i++) {
          const point = points[i];
          ctx.lineTo(point.x, point.y);
        }

        ctx.stroke();
      }
    },
    [isDrawing, cursor, getEventPosition, redrawCanvas]
  );

  // 结束绘制
  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentPathRef.current) return;

    setIsDrawing(false);

    // 保存当前路径的副本
    const currentPath = currentPathRef.current;
    currentPathRef.current = null;

    // 保存路径到状态
    if (currentPath && currentPath.points && currentPath.points.length > 1) {
      setDrawingPaths((prev) => [...prev, currentPath]);
    }
  }, [isDrawing]);

  // 设置canvas尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasRef.current?.parentElement;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [redrawCanvas]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(
      0,
      0,
      canvasRef.current?.width || 0,
      canvasRef.current?.height || 0
    );
    setDrawingPaths([]);
  }, [selectedIds, cursor]);

  return (
    <div
      key={layer.id}
      {...{ [DATA_SCENA_ELEMENT_ID]: layer.id }}
      {...layer.attrs}
    >
      <img src={layer.imgSrc || ""} onLoad={layer.onLoad} />
      {layer.children}
      {/* <canvas
      ref={canvasRef}
      className={prefix("layer-canvas")}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      style={{
        pointerEvents: cursor === 'pen' && selectedIds?.includes(layer.id) ? 'all' : 'none',
      }}
    /> */}
    </div>
  );
};

const Viewport = ({
  children,
  onBlur,
  style,
}: {
  children: React.ReactNode;
  onBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  style: React.CSSProperties;
}) => {
  const { layers, viewportRef, cursor, selectedTargets, viewportSize, selectTargets } =
    useContext(EditorContext);
  const [currentExpandLayer, setCurrentExpandLayer] = useState<LayerInfo | null>(null);
  const expandViewportRef = useRef<HTMLDivElement | null>(null);
  const [expandReady, setExpandReady] = useState(false);

  useEffect(() => {
    if (
      cursor === "expand" &&
      selectedTargets &&
      selectedTargets?.length === 1
    ) {
      const target = selectedTargets[0];
      const frame = moveableData.getFrame(target);
      const layer = layers?.find((layer) => layer.id === getId(target));
      if (!layer) return;
      setCurrentExpandLayer({
        ...layer,
        frame,
      })
    } else {
      setExpandReady(false);
    }
  }, [cursor]);

  useEffect(() => {
    // 过渡状态，expandTarget已出现，原元素尚未消失，需要等待expandReady
    if (currentExpandLayer) {
      const expandTarget = expandViewportRef.current?.querySelector<HTMLElement>(`[${DATA_SCENA_ELEMENT_ID}="${currentExpandLayer.id}"]`);
      if (!expandTarget) return;
      moveableData.createFrame(expandTarget, currentExpandLayer.frame);
      moveableData.render(expandTarget);
      selectTargets?.([expandTarget]);
    }
  }, [currentExpandLayer])

  useEffect(() => {
    // 过渡状态，原target已经在viewport出现，复位后置空currentExpandLayer
    if (!expandReady && currentExpandLayer) {
      const expandTarget = expandViewportRef.current?.querySelector<HTMLElement>(`[${DATA_SCENA_ELEMENT_ID}="${currentExpandLayer?.id}"]`);
      if (!expandTarget || !currentExpandLayer) return;
      const frame = moveableData.getFrame(expandTarget);
      const target = getTarget(currentExpandLayer.id);
      if (!target) return;
      moveableData.createFrame(target, frame);
      moveableData.render(target);
      selectTargets?.([target]);
    }
  }, [expandReady])

  const displayLayers = useMemo(() => {
    // expandReady后再返回
    if (cursor === "expand" && currentExpandLayer && expandReady) {
      return [...(layers || [])].reverse().filter((layer) => layer.id !== currentExpandLayer?.id);
    }
    return [...(layers || [])].reverse();
  }, [layers, currentExpandLayer, expandReady, cursor])

  return (
    <div className={prefix("viewport-container")} onBlur={onBlur} style={style}>
      {children}
      <div
        className={prefix("viewport")}
        ref={viewportRef}
        style={{
          width: viewportSize?.width,
          height: viewportSize?.height,
        }}
      >
        {displayLayers.map((layer) => (
          <Layer {...layer} key={layer.id} onLoad={() => {
            if (currentExpandLayer && layer.id === currentExpandLayer?.id) {
              setCurrentExpandLayer(null);
            }
          }}></Layer>
        ))}
      </div>
      <>
        {cursor === "expand" && <div className={prefix("expand-layer-mask")}></div>}
        <div
          ref={expandViewportRef}
          className={prefix("expand-layer-viewport")}
          style={{
            width: viewportSize?.width,
            height: viewportSize?.height,
            pointerEvents: cursor === "expand" ? "auto" : "none",
          }}
        >
          {/* 操作层，选区、扩图、抠图都需要在这层做 */}
          {currentExpandLayer && 
            <Layer {...currentExpandLayer} key={currentExpandLayer?.id} onLoad={() => {
              setExpandReady(true);
            }}>
              {/* 扩图 */}
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '150%',
                height: '150%',
                transform: 'translate(-12.5%, -12.5%)',
                pointerEvents: 'none',
                border: '1px solid red',
                backgroundColor: 'red',
              }}></div>
            </Layer>
          }
        </div>
      </>
    </div>
  );
};

export default Viewport;
