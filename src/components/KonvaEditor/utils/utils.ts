import type { Node } from "konva/lib/Node";
import type { Stage } from "konva/lib/Stage";
import type { Layer, Position, Rect } from "../type/types";
import { loadImageOnce } from "../hooks/useCachedImage";

export function isNumber(value: any): value is number {
  return typeof value === "number";
}

export const getCanvasPointer = (stage: Stage): Position => {
  const pointer = stage.getPointerPosition();
  const scale = stage.scaleX();
  const pos = stage.position();
  return {
    x: (pointer!.x - pos.x) / scale,
    y: (pointer!.y - pos.y) / scale,
  };
};

export const getCanvasAbsolutePosition = (node: Node): Position => {
  const absolutePosition = node.getAbsolutePosition();
  const stage = node.getStage();
  const currentScale = stage?.scaleX() || 1;
  const stagePos = stage?.position() || { x: 0, y: 0 };

  return {
    x: (absolutePosition.x - stagePos.x) / currentScale,
    y: (absolutePosition.y - stagePos.y) / currentScale,
  };
};

export const getCanvasRect = (node: Node): Rect => {
  const stage = node.getStage();
  const rect = node.getClientRect();
  const scale = stage?.scaleX() || 1;
  const pos = stage?.position() || { x: 0, y: 0 };
  return {
    x: (rect.x - pos.x) / scale,
    y: (rect.y - pos.y) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
};

/**
 * 判断一个点击点是否在多个 Konva 节点的 selection 框内（基于 getClientRect）
 * @param nodes 被选中的 Konva 节点列表
 * @param point 点击点，stage 坐标系下的 { x, y }
 * @returns 是否在 selection 框内部
 */
export const isPointInSelectionBox = (
  nodes: Node[],
  point: Position
): boolean => {
  if (!nodes || nodes.length === 0) return false;

  // 计算所有节点的全局 bounding box（包含旋转缩放）
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    const box = getCanvasRect(node);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );
};

export const isRectOverlap = (rect1: Rect, rect2: Rect): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

export function uploadFileAndGetLocalUrl(): Promise<{
  imgSrc: string;
  image: HTMLImageElement;
}> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";

    // 插入 DOM，触发点击
    document.body.appendChild(input);
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        loadImageOnce(url).then((img) => {
          resolve(img);
        });
      } else {
        reject(new Error("未选择任何文件"));
      }

      // 清理 DOM
      input.remove();
    };

    input.onerror = () => {
      input.remove();
      reject(new Error("文件选择失败"));
    };
  });
}

/**
 * 缩放时获取position点用，point不传默认中心点
 * @param stage
 * @param newScale
 * @param point
 */
export const getNewScalePoint = (
  stage: any,
  newScale: number,
  _point?: Position
): Position => {
  const stagePos = stage.position();
  const scale = stage.scaleX();
  const point = _point || {
    x: (stage.width() || 0) / 2,
    y: (stage.height() || 0) / 2,
  };

  const pointTo = {
    x: (point.x - stagePos.x) / scale,
    y: (point.y - stagePos.y) / scale,
  };

  const newPoint = {
    x: point.x - pointTo.x * newScale,
    y: point.y - pointTo.y * newScale,
  };
  return newPoint;
};

/**
 * 根据layer的尺寸和扩展比例计算expandRect
 * @param layerWidth layer的宽度
 * @param layerHeight layer的高度
 * @param expandRatio 扩展比例，可以是'original'或数字比例
 * @returns 计算后的expandRect {x, y, width, height}
 */
export const getExpandRect = (
  layer?: Layer,
  expandRatio?: "original" | number,
  expandTimes?: number
): Rect => {
  if (!layer || !expandRatio) return { x: 0, y: 0, width: 0, height: 0 };

  // 如果是原始比例，直接返回原始尺寸
  if (expandRatio === "original") {
    if (!expandTimes) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: layer.x - (layer.width * (expandTimes - 1)) / 2,
      y: layer.y - (layer.height * (expandTimes - 1)) / 2,
      width: layer.width * expandTimes,
      height: layer.height * expandTimes,
    };
  }

  // 计算目标比例
  const targetRatio = expandRatio;
  const currentRatio = layer.width / layer.height;

  let newWidth: number;
  let newHeight: number;

  if (targetRatio > currentRatio) {
    // 目标比例更宽，以高度为基准
    newHeight = layer.height;
    newWidth = newHeight * targetRatio;
  } else {
    // 目标比例更窄，以宽度为基准
    newWidth = layer.width;
    newHeight = newWidth / targetRatio;
  }

  // 计算居中位置
  const offsetX = layer.x + (layer.width - newWidth) / 2;
  const offsetY = layer.y + (layer.height - newHeight) / 2;

  return {
    x: offsetX,
    y: offsetY,
    width: newWidth,
    height: newHeight,
  };
};

export const getLayerData = (
  layer: Layer,
  exportFormat: "JPG" | "PNG" = "PNG"
) => {
  return new Promise<Blob>((resolve, reject) => {
    try {
      const {
        cropX = 0,
        cropY = 0,
        cropWidth,
        cropHeight,
        width,
        height,
        image,
      } = layer;

      // 创建 canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("无法获取 Canvas 2D 上下文"));
      }

      // 使用 drawImage 进行裁剪和缩放
      // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      // sx, sy: 源图片的裁剪起点
      // sWidth, sHeight: 源图片的裁剪宽高
      // dx, dy: 目标 canvas 的绘制起点 (0, 0)
      // dWidth, dHeight: 目标 canvas 的绘制宽高
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        width,
        height
      );

      // 导出为 Blob
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error("导出 blob 失败"));
          resolve(b);
        },
        exportFormat === "JPG" ? "image/jpeg" : "image/png",
        1
      );
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 获取layer的图片文件，传给后端用
 */
export const getLayerFile = async (
  layer: Layer,
  exportFormat: "JPG" | "PNG" = "PNG"
) => {
  const blob = (await getLayerData(layer, exportFormat)) as Blob;
  const ext = exportFormat === "JPG" ? "jpg" : "png";
  return new File([blob], `image_${layer.id}.${ext}`, {
    type: exportFormat === "JPG" ? "image/jpeg" : "image/png",
  });
};
