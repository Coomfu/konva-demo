import React from 'react';
import './index.css';
import useEditor from './hooks/useEditor';
import EditorContext from './hooks/Context';
import Menu from './components/Menu';
import Viewport from './components/Viewport';
import ToolBar from './components/ToolBar';

const KonvaEditor: React.FC = () => {
  const editorState = useEditor();

  return (
    <EditorContext.Provider value={editorState}>
      <div className="editor">
        <Menu />
        <ToolBar />
        <div className="viewer">
          <Viewport
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      </div>
    </EditorContext.Provider>
  );
};

export default KonvaEditor;
