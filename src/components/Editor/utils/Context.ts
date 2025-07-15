import { createContext } from "react";
import Moveable from "react-moveable";
import type Selecto from "react-selecto";
import type { LayerInfo } from "./types";

export type EditorContextType = {
  selectedTargets?: (HTMLElement | SVGElement)[];
  selectTargets?: (targets: (HTMLElement | SVGElement)[]) => void;
  selectedIds?: string[];
  zoom?: number;
  setZoom?:  React.Dispatch<React.SetStateAction<number>>
  cursor?: 'default' | 'pen' | 'select' | 'expand';
  setCursor?:  React.Dispatch<React.SetStateAction<'default' | 'pen' | 'select' | 'expand'>>
  layers?: LayerInfo[];
  updateLayers?:  React.Dispatch<React.SetStateAction<LayerInfo[]>>
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  moveableRef?: React.RefObject<Moveable | null>;
  selectoRef?: React.RefObject<Selecto | null>;
  viewportSize?: {width: number, height: number};
  setViewportSize?: React.Dispatch<React.SetStateAction<{width: number, height: number}>>;
  exportViewport?: () => void;
}

const EditorContext = createContext<EditorContextType>({});

export default EditorContext;

