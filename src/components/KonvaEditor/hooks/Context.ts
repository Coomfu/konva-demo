import { createContext } from "react";
import type { IObject, Layer, LayerHistory, Position, Size } from "../type/types";
import type Konva from "konva";
import type { HistoryManager } from "./useHistoryManager";

export type EditorContextType = {
  cursor?: 'default' | 'pen' | 'select' | 'expand';
  setCursor?: React.Dispatch<React.SetStateAction<'default' | 'pen' | 'select' | 'expand'>>;
  layers?: Layer[];
  selectedLayer?: Layer;
  selectedLayers?: Layer[];
  setLayers?: React.Dispatch<React.SetStateAction<Layer[]>>;
  updateLayers?: (nodes: any[]) => void;
  selectedIds?: string[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<string[]>>;
  viewportSize?: Size;
  viewportPos?: Position;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  containerSize?: Size;
  setViewportSize?: React.Dispatch<React.SetStateAction<Size>>;
  stageRef?: React.RefObject<Konva.Stage | null>;
  transformerRef?: React.RefObject<Konva.Transformer | null>;
  mainLayerRef?: React.RefObject<Konva.Layer | null>;
  editLayerRef?: React.RefObject<Konva.Layer | null>;
  zoomScale?: number;
  setZoomScale?: React.Dispatch<React.SetStateAction<number>>;
  historyManager?: HistoryManager;
  layersHistory?: LayerHistory[];
  addLayerHistory?: (newLayer: Layer) => void;
  addLayerHistoryImage?: (id: string, imgSrc: string) => void;
  imagesCache?: { [id: string]: HTMLImageElement };
  editState?: IObject<any>;
  setEditState?: React.Dispatch<React.SetStateAction<IObject<any>>>;
}

const EditorContext = createContext<EditorContextType>({});

export default EditorContext;

