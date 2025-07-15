import MoveableHelper from "moveable-helper";
import { Frame, type NameType } from "scenejs";
import { getId } from "./utils";

export type MoveableData = MoveableHelper & {
    selectedTargets: Array<HTMLElement | SVGElement>;
    setSelectedTargets: (targets: Array<HTMLElement | SVGElement>) => void;
    getSelectedFrames: () => Frame[];
    renderFrames: () => void;
    setOrders: (scope: string[], orders: NameType[]) => void;
    setProperty: (names: string[], value: any) => void;
    removeProperties: (...names: string[]) => void;
}

function createMoveableData(): MoveableData {
    const helper = new MoveableHelper({
        createAuto: true,
        useBeforeRender: true,
    });
    
    let selectedTargets: Array<HTMLElement | SVGElement> = [];

    const setSelectedTargets = (targets: Array<HTMLElement | SVGElement>) => {
        selectedTargets = targets;
    };

    const getSelectedFrames = (): Frame[] => {
        return selectedTargets.map(target => helper.getFrame(target));
    };

    const renderFrames = () => {
        selectedTargets.forEach((target: any) => {
            helper.render(target);
        });
    };

    const setOrders = (scope: string[], orders: NameType[]) => {
        return setValue(frame => {
            frame.setOrders(scope, orders);
        });
    };

    const setProperty = (names: string[], value: any) => {
        return setValue(frame => {
            frame.set(...names, value);
        });
    };

    const removeProperties = (...names: string[]) => {
        return setValue((frame, target) => {
            names.forEach(name => {
                frame.remove(name);
                target.style.removeProperty(name);
            });
        });
    };

    const setValue = (callback: (frame: Frame, target: HTMLElement | SVGElement) => void) => {
        const targets = selectedTargets;

        const infos = targets.map(target => {
            const frame = helper.getFrame(target);
            const prevOrders = frame.getOrderObject();
            const prev = frame.get();

            callback(frame, target);
            const next = frame.get();
            const nextOrders = frame.getOrderObject();

            return { id: getId(target), prev, prevOrders, next, nextOrders };
        });
        
        renderFrames();
        return infos;
    };

    const getTargets = helper.getTargets;
    const getFrames = helper.getFrames;
    const getFrame = helper.getFrame;
    const createFrame = helper.createFrame;
    const removeFrame = helper.removeFrame;
    const render = helper.render;

    return {
        ...helper,
        selectedTargets,
        setSelectedTargets,
        getSelectedFrames,
        renderFrames,
        setOrders,
        setProperty,
        removeProperties,
        getTargets,
        getFrames,
        getFrame,
        createFrame,
        removeFrame,
        render
    } as unknown as MoveableData;
}

export default createMoveableData()