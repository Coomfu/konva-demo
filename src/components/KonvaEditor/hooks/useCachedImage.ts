import type { LayerHistory } from '../type/types' 
import { useEffect, useState } from "react";

const imagesCache = new Map<string, HTMLImageElement>();

export function loadImageOnce(src: string): Promise<{ imgSrc: string, image: HTMLImageElement }> {
  if (imagesCache.has(src)) {
    return Promise.resolve({ imgSrc: src, image: imagesCache.get(src)! });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imagesCache.set(src, img);
      resolve({ imgSrc: src, image: img });
    };
    img.onerror = reject;
  });
}

const useCachedImages = (history: LayerHistory[]): { [id: string]: HTMLImageElement } => {
  const [images, setImages] = useState<{ [id: string]: HTMLImageElement }>({});

  useEffect(() => {
    let cancelled = false;
    const result: { [id: string]: HTMLImageElement } = {}
    if (history && history.length) {
      Promise.all(history.reduce((acc, layer) => {
        acc.push(...layer.images.map((imgSrc) => loadImageOnce(imgSrc)))
        return acc
      }, [] as any[])).then((imgs) => {
        if (!cancelled) {
          imgs.forEach(({ imgSrc, image }) => {
            result[imgSrc] = image
          })
          setImages(result)
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [history]);

  return images;
}

export default useCachedImages;