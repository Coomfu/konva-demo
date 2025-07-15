import { useContext } from "react";
import Moveable, { type MoveableManagerInterface } from "react-moveable";
import EditorContext from "../utils/Context";
import keyManager from '../utils/KeyManager'
import moveableData from '../utils/MoveableData'
import historyManager from "../utils/HistoryManager";
import { getId, getIds } from "../utils/utils";

export interface DimensionViewableProps {
  dimensionViewable?: boolean;
}

const DimensionViewable = {
  name: "dimensionViewable",
  props: {
    dimensionViewable: Boolean,
  },
  events: {},
  render(moveable: MoveableManagerInterface) {
    const { left, top } = moveable.state;

    const rect = moveable.getRect();

    return (
      <div
        key={"dimension-viewer"}
        className={"moveable-dimension"}
        style={{
          left: `${rect.left + rect.width / 2 - left}px`,
          top: `${rect.top + rect.height + 20 - top}px`,
        }}
      >
        {Math.round(rect.offsetWidth)} x {Math.round(rect.offsetHeight)}
      </div>
    );
  },
};

const MovableManager = ({
  verticalGuidelines,
  horizontalGuidelines,
}: {
  verticalGuidelines: number[];
  horizontalGuidelines: number[];
}) => {
  const {
    selectedTargets,
    moveableRef,
    selectoRef,
    cursor
  } = useContext(EditorContext);

  if (!selectedTargets?.length) {
    return null;
  }

  const elementGuidelines = [...(moveableData.getTargets() || [])].filter(
    (el) => {
      return selectedTargets.indexOf(el) === -1;
    }
  );

  const isShift = keyManager?.keycon.shiftKey;

  return (
    <Moveable<DimensionViewableProps>
      ables={[DimensionViewable]}
      ref={moveableRef}
      targets={selectedTargets}
      dimensionViewable={true}
      draggable={cursor !== 'pen'}
      resizable={true}
      throttleResize={1}
      clippable={false}
      // clipArea={false}
      // clipRelative={false}
      // defaultClipPath="inset"
      // clipTargetBounds={false}
      dragArea={selectedTargets.length > 1}
      // dragWithClip={false}
      checkInput={false}
      throttleDragRotate={isShift ? 45 : 0}
      keepRatio={isShift}
      rotatable={true}
      snappable={true}
      snapCenter={true}
      snapGap={false}
      roundable={true}
      verticalGuidelines={verticalGuidelines}
      horizontalGuidelines={horizontalGuidelines}
      elementGuidelines={elementGuidelines}
      onBeforeRenderStart={moveableData.onBeforeRenderStart}
      onBeforeRenderGroupStart={moveableData.onBeforeRenderGroupStart}
      onDragStart={(e) => {
        e.datas.prevFrame = moveableData.getFrame(e.target).get();
        moveableData.onDragStart(e);
      }}
      onDrag={moveableData.onDrag}
      onDragEnd={(e) => {
        const id = getId(e.target)
        historyManager.addAction("move", {
          prevFrameMap: { [id]: e.datas.prevFrame },
          nextFrameMap: { [id]: moveableData.getFrame(e.target).get() },
          ids: [id],
        });
      }}
      onDragGroupStart={(e) => {
        const targets = e.targets;
        const prevFrameMap: Record<string, any> = {}
        targets.forEach((target) => {
          prevFrameMap[getId(target)] = moveableData.getFrame(target).get()
        })
        e.datas.prevFrameMap = prevFrameMap;
        moveableData.onDragGroupStart(e);
      }}
      onDragGroup={moveableData.onDragGroup}
      onDragGroupEnd={(e) => {
        const targets = e.targets;
        const ids = getIds(targets);
        const nextFrameMap: Record<string, any> = {};
        ids.forEach((id, index) => {
          nextFrameMap[id] = moveableData.getFrame(targets[index]).get();
        })
        historyManager.addAction("move", {
          prevFrameMap: e.datas.prevFrameMap,
          nextFrameMap,
          ids,
        })
      }}
      onScaleStart={moveableData.onScaleStart}
      onScale={moveableData.onScale}
      onScaleGroupStart={moveableData.onScaleGroupStart}
      onScaleGroup={moveableData.onScaleGroup}
      onResizeStart={moveableData.onResizeStart}
      onResize={moveableData.onResize}
      onResizeGroupStart={moveableData.onResizeGroupStart}
      onResizeGroup={moveableData.onResizeGroup}
      onRotateStart={moveableData.onRotateStart}
      onRotate={moveableData.onRotate}
      onRotateGroupStart={moveableData.onRotateGroupStart}
      onRotateGroup={moveableData.onRotateGroup}
      onClip={moveableData.onClip}
      onDragOriginStart={moveableData.onDragOriginStart}
      onDragOrigin={(e) => {
        moveableData.onDragOrigin(e);
      }}
      onRound={moveableData.onRound}
      onClickGroup={(e) => {
        selectoRef?.current!.clickTarget(e.inputEvent, e.inputTarget);
      }}
      // onRenderStart={(e) => {
      //   e.datas.prevData = moveableData.getFrame(e.target).get();
      // }}
      // onRender={(e) => {
      //   e.datas.isRender = true;
      // }}
      // onRenderEnd={(e) => {
      //   if (!e.datas.isRender) {
      //     return;
      //   }
      // }}
      // onRenderGroupStart={(e) => {
      //   e.datas.prevDatas = e.targets.map((target) =>
      //     moveableData.getFrame(target).get()
      //   );
      // }}
      // onRenderGroup={(e) => {
      //   e.datas.isRender = true;
      // }}
      // onRenderGroupEnd={(e) => {
      //   if (!e.datas.isRender) {
      //     return;
      //   }
      // }}
      bounds={{
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        position: "css",
      }}
    ></Moveable>
  );
};

export default MovableManager;
