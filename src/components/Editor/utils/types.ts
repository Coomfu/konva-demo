export interface IObject<T> {
    [name: string]: T;
}

export interface ScenaEditorState {
    selectedTargets: Array<SVGElement | HTMLElement>;
    horizontalGuides: number[];
    verticalGuides: number[];
    zoom: number;
}

export interface TagAppendInfo {
    tag: any;
    props: IObject<any>;
    name: string;
    frame: IObject<any>;
}

export interface Clipboard {
    write(items: ClipboardItem[]): Promise<void>;
}
export interface ClipboardItem {
    types: string[];
    getType(type: string): Promise<Blob>;
}


export interface SavedScenaData {
    name: string;
    jsxId: string;
    componentId: string;
    tagName: string;
    innerHTML?: string;
    innerText?: string;
    attrs: IObject<any>;
    frame: IObject<any>;
    children: SavedScenaData[];
}
export interface ScenaProps {
    scenaElementId?: string;
    scenaAttrs?: IObject<any>;
    scenaText?: string;
    scneaHTML?: string;
}

export type ScenaFunctionComponent<T> = ((props: T & ScenaProps) => React.ReactElement<any, any>) & { scenaComponentId: string };
export type ScenaComponent = React.JSXElementConstructor<ScenaProps> & { scenaComponentId: string };
export type ScenaJSXElement
    = React.ReactElement<any, string>
    | ScenaFunctionJSXElement;
export type ScenaFunctionJSXElement = React.ReactElement<any, ScenaComponent>;
export type ScenaJSXType = ScenaJSXElement | string | ScenaComponent;


export interface LayerInfo {
    id: string;
    name: string;
    attrs?: IObject<any>;
    frame?: IObject<any>;
    imgSrc?: string;
    el?: HTMLElement;
    index?: number;
}

export interface BrushSettings {
    color: string;
    size: number;
    opacity: number;
}

export interface DrawingPath {
    points: { x: number; y: number }[];
    settings: BrushSettings;
}