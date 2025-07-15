import { useState, useEffect } from "react";
import domtoimage from "dom-to-image";

const useDomImage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processTime, setProcessTime] = useState<number>(0);

  const output = async (imgList: string[]): Promise<{ 
    dataUrl: string; 
    blob?: Blob;
  }> => {
    if (!imgList.length) {
      throw new Error("图片列表不能为空");
    }

    setIsProcessing(true);
    const startTime = performance.now();

    try {
      // 创建临时容器
      const container = document.createElement('div');
      container.style.width = '1024px';
      container.style.height = `${1024 * imgList.length}px`;
      container.style.backgroundColor = 'white';
      container.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      
      document.body.appendChild(container);

      // 等待所有图片加载完成
      const loadPromises = imgList.map((imgSrc, index) => {
        return new Promise<void>((resolve, reject) => {
          const img = document.createElement('img');
          img.style.width = '1024px';
          img.style.height = '1024px';
          img.style.objectFit = 'cover'; // 保持比例，裁剪超出部分
          img.style.objectPosition = 'center';
          
          img.onload = () => {
            resolve();
          };
          
          img.onerror = () => {
            reject(new Error(`图片加载失败: ${imgSrc}`));
          };
          
          img.src = imgSrc;
          container.appendChild(img);
        });
      });

      // 等待所有图片加载完成
      await Promise.all(loadPromises);

      // 使用dom-to-image导出
      const dataUrl = await domtoimage.toPng(container, {
        width: 1024,
        height: 1024 * imgList.length,
        style: {
          'transform': 'scale(1)',
          'transform-origin': 'top left',
        }
      });

      // 同时生成blob（如果需要下载）
      const blob = await domtoimage.toBlob(container, {
        width: 1024,
        height: 1024 * imgList.length,
        style: {
          'transform': 'scale(1)',
          'transform-origin': 'top left',
        }
      });

      // 清理DOM
      document.body.style.overflow = 'auto';
      document.body.removeChild(container);

      const endTime = performance.now();
      const duration = endTime - startTime;
      
console.log('xjf', duration)
      
      setIsProcessing(false);

      return {
        dataUrl,
        blob
      };

    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  };

  // 便捷的下载方法
  const downloadImage = async (imgList: string[], filename: string = 'merged-image.png') => {
    const result = await output(imgList);
    
    if (result.blob) {
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    return result;
  };

  return {
    output,
    downloadImage,
    isProcessing,
    processTime
  };
};

export default useDomImage;