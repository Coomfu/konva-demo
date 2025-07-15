import { AimOutlined, ExpandOutlined, HighlightOutlined, RollbackOutlined } from "@ant-design/icons";
import { prefix } from "../utils/utils";
import EditorContext from "../utils/Context";
import { useContext } from "react";
import historyManager from "../utils/HistoryManager";
import { message, Select } from "antd";

const ToolBar = () => {

  const {
    cursor,
    setCursor,
    selectedTargets,
    viewportSize,
    setViewportSize
  } = useContext(EditorContext);

  const changeCursor = (cursor: 'default' | 'pen' | 'select' | 'expand') => {
    if (cursor !== 'default') {
      if (selectedTargets && selectedTargets?.length > 1) {
        message.error('只能选择一个图层哦')
        return
      } else if (selectedTargets?.length === 0) {
        message.error('请选择一个图层哦')
        return
      }
    }
    setCursor?.(cursor);
  }

  return (
    <div className={prefix("tool-bar")}>
      <Select options={[
        { label: '512x512', value: '512x512' },
        { label: '512x288', value: '512x288' },
        { label: '288x512', value: '288x512' },
      ]} value={`${viewportSize?.width}x${viewportSize?.height}`} onChange={(value) => {
        setViewportSize?.({
          width: Number(value.split('x')[0]),
          height: Number(value.split('x')[1]),
        });
      }} />
      <div className={`${prefix("tool-bar-item")} ${historyManager.hasUndo() ? "" : prefix("tool-bar-item-disabled")}`} onClick={() => {
        historyManager.undo();
      }}>
        <RollbackOutlined />
      </div>
      <div className={`${prefix("tool-bar-item")} ${historyManager.hasRedo() ? "" : prefix("tool-bar-item-disabled")}`} onClick={() => {
        historyManager.redo();
      }}>
        <RollbackOutlined style={{ transform: 'rotate(180deg)' }} />
      </div>
      ｜
      <div className={`${prefix("tool-bar-item")} ${cursor === 'default' ? prefix("tool-bar-item-selected") : ""}`} onClick={() => {
        changeCursor('default');
      }}>
        <AimOutlined />
      </div>
      <div className={`${prefix("tool-bar-item")} ${cursor === 'pen' ? prefix("tool-bar-item-selected") : ""}`} onClick={() => {
        changeCursor('pen');
      }}>
        <HighlightOutlined />
      </div>
      <div className={`${prefix("tool-bar-item")} ${cursor === 'expand' ? prefix("tool-bar-item-selected") : ""}`} onClick={() => {
        changeCursor('expand');
      }}>
        <ExpandOutlined />
      </div>
      
    </div>
  )
}

export default ToolBar;