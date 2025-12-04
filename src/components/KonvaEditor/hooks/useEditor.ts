import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorContextType } from "./Context";
import type {
  IObject,
  Layer,
  LayerHistory,
  Position,
  Size,
} from "../type/types";
import Konva from "konva";
import { useHistoryManager } from "./useHistoryManager";
import useCachedImages from "./useCachedImage";

const useEditor = (): Required<EditorContextType> => {
  const [cursor, setCursor] = useState<"default" | "pen" | "select" | "expand">(
    "default"
  );
  const [layers, setLayers] = useState<Layer[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedLayer = useMemo(() => {
    if (!selectedIds || !selectedIds.length || selectedIds.length > 1)
      return null;
    return layers.find((layer) => layer.id === selectedIds[0]) ?? null;
  }, [layers, selectedIds]);
  const selectedLayers = useMemo(() => {
    if (!selectedIds || !selectedIds.length) return [];
    return layers.filter((layer) => selectedIds.includes(layer.id));
  }, [layers, selectedIds]);

  const [viewportSize, setViewportSize] = useState<Size>({
    width: 512,
    height: 512,
  });
  const [containerSize, setContainerSize] = useState<Size>({
    width: 512,
    height: 512,
  });
  const viewportPos = { x: 0, y: 0 };

  const autoZoomScale = useMemo(() => {
    return Math.min(
      (containerSize.width * 0.7) / viewportSize.width,
      (containerSize.height * 0.7) / viewportSize.height
    );
  }, [containerSize, viewportSize]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const editLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoomScale, setZoomScale] = useState(1);

  const historyManager = useHistoryManager();

  const [layersHistory, setLayersHistory] = useState<LayerHistory[]>([]);

  // 图片缓存池子
  const imagesCache = useCachedImages(layersHistory);

  const [editState, setEditState] = useState<IObject<any>>({});

  const addLayerHistory = (newLayer: Layer) => {
    setLayersHistory((history) => [
      ...history,
      {
        id: newLayer.id,
        images: [newLayer.imgSrc],
        name: newLayer.name,
      },
    ]);
  };
  const addLayerHistoryImage = (id: string, imgSrc: string) => {
    setLayersHistory((history) =>
      history.map((l) => {
        if (l.id === id) return { ...l, images: [...l.images, imgSrc] };
        return l;
      })
    );
  };

  const updateLayers = (nodes: any[]) => {
    setLayers((layers) => {
      return layers.map((layer) => {
        const target = nodes.find((node) => node.id === layer.id);
        if (target) {
          return { visible: layer.visible, ...target };
        }
        return layer;
      });
    });
  };

  const restoreLayer = (layer: Layer, index: number) => {
    setLayers((layers) => {
      const newLayers = [...layers];
      newLayers.splice(index, 0, layer);
      return newLayers;
    });
    setSelectedIds?.([layer.id]);
  };
  const removeLayer = (layer: Layer, preSelectedIds?: string[]) => {
    setLayers((layers) => {
      return layers.filter((l) => l.id !== layer.id);
    });
    if (preSelectedIds) setSelectedIds?.(preSelectedIds);
    else if (selectedIds.includes(layer.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== layer.id));
    }
  };

  const focusCenter = useCallback(
    (animate: boolean = true) => {
      setZoomScale?.(autoZoomScale);
      const stage = stageRef?.current;
      if (!stage) return;

      const minX = (-viewportPos?.x - viewportSize?.width) * autoZoomScale;
      const maxX = minX + stage.width() + viewportSize?.width * autoZoomScale;
      const minY = (-viewportPos?.y - viewportSize?.height) * autoZoomScale;
      const maxY = minY + stage.height() + viewportSize?.height * autoZoomScale;

      const newCenter = {
        x: (maxX + minX) / 2,
        y: (maxY + minY) / 2,
      };

      if (!animate) {
        stage.scale({ x: autoZoomScale, y: autoZoomScale });

        stage.position(newCenter);
        return;
      }

      new Konva.Tween({
        node: stage,
        duration: 0.4,
        scaleX: autoZoomScale,
        scaleY: autoZoomScale,
        x: newCenter.x,
        y: newCenter.y,
        easing: Konva.Easings.EaseInOut,
      }).play();
    },
    [autoZoomScale, viewportSize]
  );

  useEffect(() => {
    focusCenter();
  }, [focusCenter]);

  // 监听容器尺寸变化
  useEffect(() => {
    const updateSize = () => {
      setContainerSize({
        width: containerRef.current?.clientWidth || 0,
        height: containerRef.current?.clientHeight || 0,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setContainerSize({ width: clientWidth, height: clientHeight });
    }

    // 初始化history事件
    // 拖拽、旋转、缩放等改变node操作
    historyManager?.registerType(
      "changeNode",
      ({ preNodes }) => {
        // node都是toObject的数据
        updateLayers(preNodes);
        setSelectedIds?.(preNodes.map((node: any) => node.id) || []);
      },
      ({ nextNodes }) => {
        updateLayers(nextNodes);
        setSelectedIds?.(nextNodes.map((node: any) => node.id) || []);
      }
    );
    historyManager?.registerType(
      "undoCreateLayer",
      ({ layer, index }) => {
        restoreLayer(layer, index);
      },
      ({ layer }) => {
        removeLayer(layer);
      }
    );
    historyManager?.registerType(
      "createLayer",
      ({ layer, preSelectedIds = [] }) => {
        removeLayer(layer, preSelectedIds);
      },
      ({ layer, index }) => {
        restoreLayer(layer, index);
      }
    );
  }, []);

  return {
    cursor,
    setCursor,
    layers,
    selectedLayer,
    selectedLayers,
    setLayers,
    updateLayers,
    selectedIds,
    setSelectedIds,
    viewportSize,
    viewportPos,
    setViewportSize,
    mainLayerRef,
    editLayerRef,
    stageRef,
    transformerRef,
    zoomScale,
    setZoomScale,
    containerRef,
    containerSize,
    historyManager,
    layersHistory,
    addLayerHistory,
    addLayerHistoryImage,
    imagesCache,
    editState,
    setEditState,
  };
};

export default useEditor;
