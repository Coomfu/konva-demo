import { useContext, useMemo } from "react";
import { checkImageLoaded, getId, getIds, getScenaAttrs, getTarget, prefix } from "../utils/utils";
import EditorContext from "../utils/Context";
import { v4 as uuidv4 } from "uuid";
import { Dropdown } from "antd";
import { EllipsisOutlined, EyeOutlined } from "@ant-design/icons";
import type { LayerInfo } from "../utils/types";
import image from "../../../assets/image.png";
import useDomImage from "../hooks/useDomImage";
import historyManager from "../utils/HistoryManager";
import keyManager from "../utils/KeyManager";
import moveableData from "../utils/MoveableData";

const Menu = () => {
  const {
    layers,
    updateLayers,
    selectedTargets,
    selectedIds,
    selectTargets,
    exportViewport,
    viewportSize,
    cursor,
  } = useContext(EditorContext);

  const onDropdownClick = (key: string, layer: any) => {
    if (key === 'delete') {
      removeLayer(layer.id)
    } else if (key === 'up') {
      moveLayerUp(layer.id)
    } else if (key === 'down') {
      moveLayerDown(layer.id)
    }
  };

  const onAppendLayer = () => {
    const id = uuidv4()
    const newLayer: LayerInfo = {
      name: "图层1",
      id,
      attrs: {},
      frame: {
        position: "absolute",
        left: 0,
        top: 0,
        width: `${viewportSize?.width}px`,
        height: `${viewportSize?.height}px`,
      },
      imgSrc: image,
    }
    updateLayers?.((layers) => [
      newLayer,
      ...layers,
    ]);
    requestAnimationFrame(() => {
      const target = getTarget(id);
      
      if (!target) return;

      newLayer.el = target;

      for (const name in newLayer.attrs) {
          target.setAttribute(name, newLayer.attrs[name]);
      }
      newLayer.attrs = getScenaAttrs(target);

      historyManager.addAction('createLayer', {
        layer: newLayer,
        prevSelectedIds: getIds(selectedTargets || []),
      })
      
      moveableData.createFrame(target, newLayer.frame);
      moveableData.render(target);

      checkImageLoaded(target).then(() => {
        selectTargets?.([target])
      })
    })
  };

  const removeLayer = (id: string) => {
    updateLayers?.((layers) => layers.filter((layer) => layer.id !== id));
    if (selectedIds?.includes(id)) {
      selectTargets?.(selectedTargets?.filter((target) => getId(target) !== id) || []);
    }
  };

  const moveLayerUp = (id: string) => {
    updateLayers?.((layers) => {
      const index = layers.findIndex(layer => layer.id === id)
      if (index === -1 || index === 0) return layers
      const newLayers = [...layers]
      const temp = newLayers[index]
      newLayers[index] = newLayers[index - 1]
      newLayers[index - 1] = temp
      return newLayers
    })
  }

  const moveLayerDown = (id: string) => {
    updateLayers?.((layers) => {
      const index = layers.findIndex(layer => layer.id === id)
      if (index === -1 || index === layers.length - 1) return layers
      const newLayers = [...layers]
      const temp = newLayers[index]
      newLayers[index] = newLayers[index + 1]
      newLayers[index + 1] = temp
      return newLayers
    })
  }

  const selectLayers = (ids: string[]) => {
    const targets = ids.map((id) => getTarget(id)).filter(Boolean) as HTMLElement[];
    selectTargets?.(targets)
  }

  const ids = useMemo(() => getIds(selectedTargets || []), [selectedTargets]);
  const onLayerSelect = (id: string) => {
    if (keyManager?.keycon.shiftKey) {
      if (ids.includes(id)) selectLayers(ids.filter((target) => target !== id))
      else selectLayers([...ids, id])
    } else {
      selectLayers([id])
    }
  }

  const { downloadImage } = useDomImage();

  return (
    <div className={prefix("menu")}>
      <button style={{ width: "100%" }} onClick={() => {
        downloadImage(layers?.map((layer) => layer.imgSrc || "") || [])
      }}>合并图层</button>
      <button style={{ width: "100%" }} onClick={exportViewport}>导出Png</button>
      图层
      <button style={{ width: "100%" }} onClick={onAppendLayer}>
        +图层
      </button>
      <div className={prefix("menu-layers")}>
        {layers?.map((layer, index) => (
          <div key={layer.id} className={[prefix("menu-layer"), ids.includes(layer.id) ? prefix("menu-layer-selected") : ""].join(" ")} onClick={() => onLayerSelect(layer.id)}>
            <img src={layer.imgSrc} alt={layer.name} />
            <span style={{ flex: 1 }}>{layer.name}</span>
            <span>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    {
                      key: "delete",
                      label: "删除",
                    },
                    {
                      key: "up",
                      label: "上移",
                      disabled: index === 0,
                    },
                    {
                      key: "down",
                      label: "下移",
                      disabled: index === layers?.length - 1,
                    },
                  ],
                  onClick: ({ key, domEvent }) => {
                    onDropdownClick(key, layer)
                    domEvent.stopPropagation()
                  }
                }}
              >
                <EllipsisOutlined onClick={(e) => e.stopPropagation()} />
              </Dropdown>
              <EyeOutlined style={{ marginLeft: 10 }} />
            </span>
          </div>
        ))}
      </div>
      {cursor === 'expand' && <div className={prefix("expand-layer-mask")}></div>}
    </div>
  );
};

export default Menu;
