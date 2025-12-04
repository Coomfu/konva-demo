## 这是一个调研阶段输出的 Konva 图片编辑器 Demo，功能有限，主要用于学习 Konva 的用法和 crop 以及叠加 canvas 操作的可行性，不含任何业务逻辑，仅供学习参考。功能完善后的编辑器请移步我的另一个项目 [konva-layer-editor](https://github.com/Coomfu/konva-layer-editor.git)

# Konva 图片编辑器

一个基于 React + TypeScript + Konva 构建的图片编辑器 Demo，支持图层管理、图片变换、智能扩展等功能。

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 🛠️ 技术栈

- **React 18 + TypeScript** - 前端框架
- **Vite** - 构建工具
- **Konva / react-konva** - Canvas 渲染引擎
- **Ant Design** - UI 组件库
- **react-moveable / react-selecto** - 交互控制

## ✨ 核心功能

### 🎨 图层管理
- 添加/删除图层，批量导入图片
- 图层重命名与排序（上移/下移）
- 图层显示/隐藏切换
- 图层选择与快速定位（Fit 聚焦）
- 图层历史记录（支持撤销/重做图层操作）

### 🖼️ 图片编辑
- **变换操作**：拖拽移动、自由缩放、旋转、翻转
- **Transformer 控制器**：实时预览变换效果
- **多图层选择**：支持同时编辑多个图层
- **精确控制**：鼠标拖拽 + 快捷键组合

### 🎯 画布工具
- **缩放控制**：50%-200% 范围，支持鼠标滚轮缩放
- **画布平移**：拖拽或方向键平移
- **画布尺寸**：512x512、512x288、288x512 预设尺寸
- **网格背景**：辅助对齐的参考网格

### 🔧 选择模式
- **默认模式**：标准的选择和变换
- **画笔模式**：自由绘制选区
- **矩形选区**：精确矩形选择
- **扩展模式**：智能扩展选区

### 💾 导入/导出
- **导入**：支持单个或批量导入图片文件
- **导出单图**：导出选中图层为 PNG 图片
- **批量导出**：将所有图层打包为 ZIP 文件
- **导出画布**：导出整个画布的合成图片
- **数据导出**：导出图层配置数据（JSON 格式）

### ⌨️ 快捷键
- `Cmd/Ctrl + Z`：撤销
- `Cmd/Ctrl + Shift + Z`：重做
- `Delete / Backspace`：删除选中图层
- `方向键`：平移画布
- `Cmd/Ctrl + 鼠标滚轮`：缩放画布

### 📜 历史记录
- 完整的撤销/重做系统
- 支持图层创建/删除的历史追溯
- 支持图片变换操作的历史追溯
- 图片缓存池，优化性能

## 📦 项目结构

```
src/components/
├── KonvaEditor/           # 基于 Konva 的编辑器（主要实现）
│   ├── components/        # Menu、ToolBar、Viewport 等组件
│   ├── hooks/             # useEditor、useCachedImage 等
│   ├── utils/             # 工具函数和常量
│   └── type/              # TypeScript 类型定义
└── Editor/                # 基于 Moveable 的编辑器（只适合简单功能，已放弃，仅作参考）
```

## 📄 License

MIT
