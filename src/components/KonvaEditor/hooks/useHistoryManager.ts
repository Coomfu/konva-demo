import { useState, useCallback, useRef } from "react";
import { type IObject } from "../type/types";

export type RestoreCallback = (props: any) => any;
export type HistoryManager = {
    hasUndo: boolean;
    hasRedo: boolean;
    addAction: (type: string, props: IObject<any>) => void;
    registerType: (type: string, undo: RestoreCallback, redo: RestoreCallback) => void;
    undo: () => void;
    redo: () => void;
}
export interface HistoryAction {
    type: string;
    props: IObject<any>;
}

export const useHistoryManager = (): HistoryManager => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const typesRef = useRef<IObject<{ redo: RestoreCallback, undo: RestoreCallback }>>({});

  const addAction = useCallback((type: string, props: IObject<any>) => {
    setUndoStack(prev => [...prev, { type, props }]);
    setRedoStack([]);
  }, []);

  const registerType = useCallback((type: string, undo: RestoreCallback, redo: RestoreCallback) => {
    typesRef.current[type] = { undo, redo };
  }, []);

  const undo = () => {
    const undoAction = undoStack[undoStack.length - 1];
    typesRef.current[undoAction.type].undo(undoAction.props);
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const newUndoStack = prev.slice(0, -1);
      return newUndoStack;
    });
    setRedoStack(prevRedo => {
      return [...prevRedo, undoAction]
    });
  }

  const redo = () => {
    const redoAction = redoStack[redoStack.length - 1];
    typesRef.current[redoAction.type].redo(redoAction.props);
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const newRedoStack = prev.slice(0, -1);
      return newRedoStack;
    });
    setUndoStack(prevUndo => {
      return [...prevUndo, redoAction];
    });
  }

  const hasUndo = undoStack.length > 0;
  const hasRedo = redoStack.length > 0;

  return {
    hasUndo,
    hasRedo,
    addAction,
    registerType,
    undo,
    redo,
  }
}
