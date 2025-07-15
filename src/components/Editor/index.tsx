import Selecto from "react-selecto";
import "./index.css";
import { DATA_SCENA_ELEMENT_ID } from "./utils/const";
import { checkInput, getParnetScenaElement, prefix } from "./utils/utils";
import EditorContext from "./utils/Context";
import Viewport from "./components/Viewport";
import Menu from './components/Menu'
import ToolBar from './components/ToolBar'
import MovableManager from "./components/MovableManager";
import historyManager from "./utils/HistoryManager";
import useEditor from "./hooks/useEditor";
import { useEffect, useRef } from "react";

const Editor = () => {
  const {
    selectedTargets,
    selectTargets,
    selectedIds,
    zoom,
    setZoom,
    layers,
    updateLayers,
    moveableRef,
    selectoRef,
    viewportRef,
    undoCreateLayer,
    restoreLayer,
    undoMove,
    redoMove,
    exportViewport,
    cursor,
    setCursor,
    viewportSize,
    setViewportSize,
  } = useEditor();

  const editorElementRef = useRef<HTMLDivElement>(null);
  
  const checkBlur = () => {
    const activeElement = document.activeElement;
    if (activeElement) {
      (activeElement as HTMLElement).blur();
    }
    const selection = document.getSelection()!;

    if (selection) {
      selection.removeAllRanges();
    }
    // eventBus.emit("blur");
  };

  const onBlur = (e: any) => {
    const target = e.target as HTMLElement | SVGElement;

    if (!checkInput(target)) {
      return;
    }
    const parentTarget = getParnetScenaElement(target);

    if (!parentTarget) {
      return;
    }
    // TODO: Implement viewport methods for getting element info
    // This functionality needs to be implemented based on the viewport's state management
  };

  useEffect(() => {
    historyManager.registerType(
      "createLayer",
      undoCreateLayer,
      restoreLayer
    );
    historyManager.registerType(
      "removeLayer",
      restoreLayer,
      undoCreateLayer
    );
    historyManager.registerType("move", undoMove, redoMove);
  }, [])

  return (
    <EditorContext.Provider
      value={{
        selectedTargets,
        selectTargets,
        selectedIds,
        zoom,
        setZoom,
        layers,
        updateLayers,
        viewportRef,
        moveableRef,
        selectoRef,
        exportViewport,
        cursor,
        setCursor,
        viewportSize,
        setViewportSize,
      }}
    >
      <div className={prefix("editor")} ref={editorElementRef}>
        {/* <Tabs ref={tabs} editor={this}></Tabs> */}
        <Menu />
        <ToolBar />
        <div className="scena-viewer">
          <Viewport
            onBlur={onBlur}
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            <MovableManager
              verticalGuidelines={[0, 100, 50]}
              horizontalGuidelines={[0, 100, 50]}
            ></MovableManager>
          </Viewport>
        </div>
        <Selecto
          ref={selectoRef}
          dragContainer={".scena-viewer"}
          hitRate={0}
          selectableTargets={[`[${DATA_SCENA_ELEMENT_ID}]`]}
          selectByClick={true}
          selectFromInside={false}
          toggleContinueSelect={["shift"]}
          preventDefault={true}
          onDragStart={(e) => {
            const inputEvent = e.inputEvent;
            const target = inputEvent.target;

            checkBlur();

            if (cursor !== 'default') {
              e.stop();
              if (target.hasAttribute(DATA_SCENA_ELEMENT_ID)) selectTargets([target])
              else if (target.tagName !== 'CANVAS') selectTargets([])
              return;
            }

            const { clientX, clientY } = inputEvent;
            if (
              moveableRef.current?.isInside(clientX, clientY) &&
              (target.className.includes("scena-viewport-container") ||
                target.className.includes("scena-viewport"))
            ) {
              e.stop();
              moveableRef.current?.dragStart(inputEvent);
              return;
            }

            if (
              (inputEvent.type === "touchstart" && e.isTrusted) ||
              moveableRef.current?.isMoveableElement(target) ||
              selectedTargets.some((t) => t === target || t.contains(target))
            ) {
              e.stop();
            }
          }}
          onSelectEnd={({ isDragStart, selected, inputEvent }) => {
            if (isDragStart) {
              inputEvent.preventDefault();
            }
            selectTargets(selected);
            
            Promise.resolve().then(() => {
              if (!isDragStart) {
                return;
              }
              moveableRef.current?.dragStart(inputEvent);
            });
          }}
        ></Selecto>
      </div>
    </EditorContext.Provider>
  );
};

export default Editor;
