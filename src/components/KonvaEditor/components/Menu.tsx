import { useContext, useState } from "react";
import { Button, Dropdown, message, Select } from "antd";
import {
  EllipsisOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  PlusCircleFilled,
  UploadOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import EditorContext from "../hooks/Context";
import { v4 as uuidv4 } from "uuid";
import KeyManager from "../utils/KeyManager";
import type { Layer } from "../type/types";
import { getLayerData, uploadFileAndGetLocalUrl } from "../utils/utils";
import JSZip from "jszip";
import saveAs from "file-saver";

const Menu = () => {
  const {
    layers = [],
    selectedIds = [],
    selectedLayers = [],
    setSelectedIds,
    setLayers,
    viewportPos,
    viewportSize,
    stageRef,
    mainLayerRef,
    historyManager,
    layersHistory,
    addLayerHistory,
    addLayerHistoryImage,
    imagesCache = {},
  } = useContext(EditorContext);

  const [exportFormat, setExportFormat] = useState<"PNG" | "JPG">("PNG");
  const [exportContent, setExportContent] = useState<
    "selectedLayers" | "allLayers" | "canvas"
  >("selectedLayers");

  const removeLayer = (id: string) => {
    setLayers?.((prev) => prev.filter((layer) => layer.id !== id));
    setSelectedIds?.((prev) => prev.filter((selectedId) => selectedId !== id));
    historyManager?.addAction("undoCreateLayer", {
      layer: layers.find((layer) => layer.id === id),
      index: layers.findIndex((layer) => layer.id === id),
    });
  };

  const moveUpLayer = (id: string) => {
    setLayers?.((prev) => {
      const index = prev.findIndex((layer) => layer.id === id);
      if (index > 0) {
        const newLayers = [...prev];
        [newLayers[index], newLayers[index - 1]] = [
          newLayers[index - 1],
          newLayers[index],
        ];
        return newLayers;
      }
      return prev;
    });
  };

  const moveDownLayer = (id: string) => {
    setLayers?.((prev) => {
      const index = prev.findIndex((layer) => layer.id === id);
      if (index < prev.length - 1) {
        const newLayers = [...prev];
        [newLayers[index], newLayers[index + 1]] = [
          newLayers[index + 1],
          newLayers[index],
        ];
        return newLayers;
      }
      return prev;
    });
  };

  const fitLayer = (id: string) => {
    const layer = layers.find((layer) => layer.id === id);
    setLayers?.((prev) => {
      return prev.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              scaleX: 1,
              scaleY: 1,
              width: viewportSize?.width,
              height: viewportSize?.height,
              x: viewportPos?.x,
              y: viewportPos?.y,
              cropX: 0,
              cropY: 0,
              cropWidth: imagesCache[layer.imgSrc]?.width || 0,
              cropHeight: imagesCache[layer.imgSrc]?.height || 0,
              rotation: 0,
              imgWidth: viewportSize?.width || 0,
              imgHeight: viewportSize?.height || 0,
            }
          : layer
      );
    });
    historyManager?.addAction("changeNode", {
      preNodes: [layer],
      nextNodes: [
        {
          ...layer,
          scaleX: 1,
          scaleY: 1,
          x: viewportPos?.x,
          y: viewportPos?.y,
        },
      ],
    });
  };

  const onLayerAdd = (e) => {
    if (e.key === "upload") {
      uploadFileAndGetLocalUrl().then(({ imgSrc, image }) => {
        const newLayer: Layer = {
          id: uuidv4(),
          name: `图层 ${layers.length + 1}`,
          imgSrc,
          x: viewportPos?.x || 0,
          y: viewportPos?.y || 0,
          width: viewportSize?.width || 0,
          height: viewportSize?.height || 0,
          scaleX: 1,
          scaleY: 1,
          visible: true,
          cropX: 0,
          cropY: 0,
          cropWidth: image.width,
          cropHeight: image.height,
          imgWidth: viewportSize?.width || 0,
          imgHeight: viewportSize?.height || 0,
        };
        setLayers?.((prev) => [...prev, newLayer]);
        addLayerHistory?.(newLayer);
        setSelectedIds?.([newLayer.id]);
        historyManager?.addAction("createLayer", {
          layer: newLayer,
          index: layers.length,
          preSelectedIds: selectedIds,
        });
      });
    }
  };

  const onLayerImageChange = (id: string, image: string) => {
    const layer = layers.find((layer) => layer.id === id);
    const imageInstance = imagesCache[image];
    setLayers?.((prev) => {
      return prev.map((layer) => {
        return layer.id === id ? { ...layer,
          imgSrc: image,
          cropWidth: layer.cropWidth / imagesCache[layer.imgSrc]?.width * imageInstance.width,
          cropHeight: layer.cropHeight / imagesCache[layer.imgSrc]?.height * imageInstance.height,
          cropX: layer.cropX / imagesCache[layer.imgSrc]?.width * imageInstance.width,
          cropY: layer.cropY / imagesCache[layer.imgSrc]?.height * imageInstance.height,
        } : layer
    });
    });
    historyManager?.addAction("changeNode", {
      preNodes: [layer],
      nextNodes: [{ ...layer, imgSrc: image }],
    });
  };

  const onLayerAction = (key: string, layer: any) => {
    if (key === "delete") {
      removeLayer?.(layer.id);
    } else if (key === "up") {
      moveDownLayer?.(layer.id);
    } else if (key === "down") {
      moveUpLayer?.(layer.id);
    } else if (key === "fit") {
      fitLayer(layer.id);
    }
  };

  const onLayerSelect = (id: string) => {
    if (KeyManager.shiftKey) {
      if (selectedIds.includes(id)) {
        setSelectedIds?.(selectedIds.filter((target) => target !== id));
      } else {
        setSelectedIds?.([...selectedIds, id]);
      }
    } else {
      setSelectedIds?.([id]);
    }
  };

  const onLayerToggleVisibility = (id: string) => {
    const layer = layers.find((layer) => layer.id === id);
    if (!layer) return;
    setLayers?.((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
    historyManager?.addAction("changeNode", {
      preNodes: [{ ...layer, visible: layer.visible }],
      nextNodes: [{ ...layer, visible: !layer.visible }],
    });
  };

  const onExport = () => {
    if (exportContent === "canvas") exportCanvas();
    else if (exportContent === "selectedLayers") {
      if (!selectedIds.length) {
        message.error('没有选中图层')
        return
      }
      exportLayers(selectedLayers);
    }
    else {
      if (!layers.length) {
        message.error('没有图层')
        return
      }
      exportLayers(layers);
    }
  };

  const exportLayers = async (layers: Layer[]) => {
    const zip = new JSZip();
  
    for (let i = 0; i < layers.length; i++) {
      try {
        const blob = await getLayerData(layers[i], exportFormat);
        const ext = exportFormat === "JPG" ? "jpg" : "png";
        zip.file(`image_${i + 1}.${ext}`, blob);
      } catch (err) {
        console.error(`处理第 ${i + 1} 张图失败:`, err);
      }
    }
  
    // 4. 导出 ZIP 包
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, "images.zip");
  };

  const exportCanvas = () => {
    const stage = stageRef?.current;
    const mainLayer = mainLayerRef?.current;
    if (!stage || !mainLayer) return;

    const scale = stage.scaleX();
    const pos = stage.position();
    const png = mainLayer.toDataURL({
      mimeType: exportFormat === "PNG" ? "image/png" : "image/jpeg",
      x: (viewportPos?.x || 0) * scale + pos.x,
      y: (viewportPos?.y || 0) * scale + pos.y,
      width: Math.ceil((viewportSize?.width || 0) * scale),
      height: Math.ceil((viewportSize?.height || 0) * scale),
      pixelRatio: 1 / scale,
    });
    const a = document.createElement("a");
    a.href = png;
    a.download = exportFormat === "PNG" ? "export.png" : "export.jpg";
    a.click();
  };
  
  return (
    <div className="menu">
      <div className="history-layers">
        {/** 如果选中，只显示选中的图层。如果没有，显示全图层 **/}
        {layers.map((layer) => {
          const history = layersHistory?.find(
            (layerHis) => layerHis.id === layer.id
          );
          return (
            <div
              key={layer.id}
              className="mb-2"
              style={{
                display:
                  selectedIds && selectedIds.length
                    ? (selectedIds.includes(layer.id)
                      ? "block"
                      : "none")
                    : "block",
              }}
            >
              <h3>{history?.name}</h3>
              <div className="history-images">
                {history?.images.map((image) => (
                  <div
                    key={image}
                    className="history-image flex-center-center"
                    style={{
                      cursor: image === layer.imgSrc ? "auto" : "pointer",
                    }}
                    onClick={() => {
                      if (image === layer.imgSrc) return;
                      onLayerImageChange(layer.id, image);
                    }}
                  >
                    <img src={image}></img>
                    {image === layer.imgSrc && (
                      <CheckCircleTwoTone twoToneColor="#1677ff" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          if (selectedIds && selectedIds.length)
            addLayerHistoryImage?.(
              selectedIds[0],
              `https://picsum.photos/300/300?${uuidv4()}`
            );
        }}
      >
        选中图层添加一个历史
      </button>
      <div className="flex-center-center">
        <h3>图层</h3>
        <Dropdown
          trigger={["click"]}
          menu={{
            onClick: onLayerAdd,
            items: [
              { label: "本地上传", icon: <UploadOutlined />, key: "upload" },
            ],
          }}
        >
          <div style={{ marginLeft: "auto", cursor: "pointer" }}>
            <PlusCircleFilled className="mr-2" />
            新建
          </div>
        </Dropdown>
      </div>
      <div className="menu-layers">
        {[...layers].reverse().map((layer, index) => (
          <div
            key={layer.id}
            className={[
              "menu-layer",
              selectedIds.includes(layer.id) ? "menu-layer-selected" : "",
            ].join(" ")}
            onClick={() => onLayerSelect(layer.id)}
          >
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
                    {
                      key: "fit",
                      label: "自适应画布",
                    },
                  ],
                  onClick: ({ key }) => onLayerAction(key, layer),
                }}
              >
                <EllipsisOutlined onClick={(e) => e.stopPropagation()} />
              </Dropdown>
              {layer.visible ? (
                <EyeOutlined
                  style={{ marginLeft: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleVisibility(layer.id);
                  }}
                />
              ) : (
                <EyeInvisibleOutlined
                  style={{ marginLeft: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleVisibility(layer.id);
                  }}
                />
              )}
            </span>
          </div>
        ))}
      </div>
      <Dropdown
        dropdownRender={() => {
          return (
            <div className="export-dropdown">
              <div style={{ display: "flex" }}>
                导出格式：
                <Select
                  value={exportFormat}
                  onSelect={setExportFormat}
                  style={{ flex: 1 }}
                  options={[
                    { label: "PNG", value: "PNG" },
                    { label: "JPG", value: "JPG" },
                  ]}
                ></Select>
              </div>
              <div style={{ display: "flex" }}>
                导出内容：
                <Select
                  value={exportContent}
                  onSelect={setExportContent}
                  style={{ flex: 1 }}
                  options={[
                    { label: "选中图层", value: "selectedLayers" },
                    { label: "所有图层", value: "allLayers" },
                    { label: "当前画布", value: "canvas" },
                  ]}
                ></Select>
              </div>
            </div>
          );
        }}
      >
        <Button style={{ width: "100%" }} onClick={onExport}>
          导出
        </Button>
      </Dropdown>
    </div>
  );
};

export default Menu;
