import { type IObject } from "./types";

export type RestoreCallback = (props: any) => any;
export type HistoryManager = {
    hasUndo: () => boolean;
    hasRedo: () => boolean;
    addAction: (type: string, props: IObject<any>) => void;
    registerType: (type: string, undo: RestoreCallback, redo: RestoreCallback) => void;
    undo: () => void;
    redo: () => void;
}
export interface HistoryAction {
    type: string;
    props: IObject<any>;
}

const createHistoryManager = (): HistoryManager => {
  const undoStack: HistoryAction[] = [];
  const redoStack: HistoryAction[] = [];
  const types: IObject<{ redo: RestoreCallback, undo: RestoreCallback }> = {};

  const addAction = (type: string, props: IObject<any>) => {
    undoStack.push({
      type,
      props,
    });
    redoStack.length = 0;
  }
  const registerType = (type: string, undo: RestoreCallback, redo: RestoreCallback) => {
    types[type] = { undo, redo };
  }
  const undo = () => {
    const undoAction = undoStack.pop();

    if (!undoAction) {
        return;
    }
    types[undoAction.type].undo(undoAction.props);
    redoStack.push(undoAction);
  }
  const redo = () => {
    const redoAction = redoStack.pop();

    if (!redoAction) {
        return;
    }
    types[redoAction.type].redo(redoAction.props);
    undoStack.push(redoAction);
  }

  const hasUndo = () => undoStack.length > 0;
  const hasRedo = () => redoStack.length > 0;

  return {
    hasUndo,
    hasRedo,
    addAction,
    registerType,
    undo,
    redo,
  }
}

export default createHistoryManager();
