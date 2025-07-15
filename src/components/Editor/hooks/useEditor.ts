import { useMemo, useRef, useState } from "react";
import moveableData from "../utils/MoveableData";
import type { EditorContextType } from "../utils/Context";
import type { IObject, LayerInfo } from "../utils/types";
import type Selecto from "react-selecto";
import type Moveable from "react-moveable";
import { checkImageLoaded, getIds, getTarget, getTargets } from "../utils/utils";
import domtoimage from "dom-to-image";

const useEditor = (): Required<EditorContextType> & {
  undoCreateLayer: (layer: LayerInfo) => void;
  restoreLayer: (layer: LayerInfo) => void;
  undoMove: ({prevFrameMap, ids}: IObject<any>) => void;
  redoMove: ({nextFrameMap, ids}: IObject<any>) => void;
  exportViewport: () => void;
} => {
  const [selectedTargets, setSelectedTargets] = useState<
    (HTMLElement | SVGElement)[]
  >([]);
  const selectedIds = useMemo(() => getIds(selectedTargets), [selectedTargets]);
  const [zoom, setZoom] = useState<number>(1);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [cursor, setCursor] = useState<'default' | 'pen' | 'select' | 'expand'>("default");
  const [viewportSize, setViewportSize] = useState<{width: number, height: number}>({width: 512, height: 512});

  const selectoRef = useRef<Selecto>(null);
  const moveableRef = useRef<Moveable>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const selectTargets = (targets: (HTMLElement | SVGElement)[]) => {
    selectoRef?.current?.setSelectedTargets(targets);
    setSelectedTargets?.(targets);
    moveableData.setSelectedTargets(targets);
  }

    // 记录操作时，都不能用target只能用id去重新获取，以防撤销创建再重做导致的target丢失
  const updateLayers: React.Dispatch<React.SetStateAction<LayerInfo[]>> = (
    layersOrUpdater: LayerInfo[] | ((prev: LayerInfo[]) => LayerInfo[])
  ) => {
    if (typeof layersOrUpdater === 'function') {
      setLayers((prev) => layersOrUpdater(prev).map((l, i) => ({...l, index: i})));
    } else {
      setLayers(layersOrUpdater.map((l, i) => ({...l, index: i})));
    }
  }

  const undoCreateLayer = (
    { layer, prevSelectedIds }: IObject<any>,
  ) => {
    updateLayers(prev => prev.filter(l => l.id !== layer.id))
  
    selectTargets(getTargets(prevSelectedIds));
  } 
  const restoreLayer = ({ layer }: IObject<any>) => {
    updateLayers(prev => {
      const newLayers = [...prev];
      newLayers.splice(layer.index, 0, layer);
      return newLayers;
    })
    requestAnimationFrame(() => {
      const target = getTarget(layer.id);
      if (!target) return;
      moveableData.createFrame(target, layer.frame);
      moveableData.render(target);
      checkImageLoaded(target).then(() => {
        selectTargets?.([target])
      })
    })
  }

  const undoMove = ({ prevFrameMap, ids }: IObject<any>) => {
    const targets = getTargets(ids);
    targets.forEach((target: HTMLElement, index: number) => {
      moveableData.removeFrame(moveableData.getFrame(target).get());
      moveableData.createFrame(target, prevFrameMap[ids[index]]);
      moveableData.render(target);
    })
    selectTargets(targets);
    moveableRef.current?.updateRect();
  }
  const redoMove = ({ nextFrameMap, ids }: IObject<any>) => {
    const targets = getTargets(ids);
    targets.forEach((target: HTMLElement, index: number) => {
      moveableData.removeFrame(moveableData.getFrame(target).get());
      moveableData.createFrame(target, nextFrameMap[ids[index]]);
      moveableData.render(target);
    })
    selectTargets(targets);
    moveableRef.current?.updateRect();
  }

  const exportViewport = () => {
    if (!viewportRef.current) {
      console.log('viewportRef.current is null')
      return;
    }

    domtoimage
        .toBlob(viewportRef.current, {
          width: 512,
          height: 512,
          style: {
            overflow: 'hidden',
          },
        })
        .then(function (blob) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'viewport.png';
          a.click();
        })
        .catch(function (error) {
          console.error('Error converting canvas to image:', error);
        });
  }

  return {
    selectedTargets,
    selectedIds,
    zoom,
    setZoom,
    layers,
    updateLayers,
    selectoRef,
    moveableRef,
    viewportRef,
    selectTargets,
    undoCreateLayer,
    restoreLayer,
    undoMove,
    redoMove,
    exportViewport,
    cursor,
    setCursor,
    viewportSize,
    setViewportSize,
  }
}

export default useEditor;