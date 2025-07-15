import KeyController from "keycon";
import { checkInput } from "./utils";

export type KeyManager = {
    keycon: KeyController;
    keylist: Array<[string[], string]>;
    enable: () => void;
    disable: () => void;
    keydown: (keys: string[], callback: (e: any) => any, description?: any) => void;
    keyup: (keys: string[], callback: (e: any) => any, description?: any) => void;
    destroy: () => void;
}

function check(e: any) {
    const inputEvent = e.inputEvent;
    const target = inputEvent.target;

    if (checkInput(target)) {
        return false;
    }
    return true;
}

function createKeyManager(): KeyManager {
    const keycon = new KeyController();
    const keylist: Array<[string[], string]> = [];
    let isEnable = true;

    const addCallback = (type: string, keys: string[], callback: (e: any) => any, description?: string) => {
        if (description) {
            keylist.push([
                keys,
                description,
            ]);
        }
        return (e: any) => {
            if (!isEnable || !check(e)) {
                return false;
            }
            callback(e);
        };
    };

    const enable = () => isEnable = true
    const disable = () => isEnable = false
    const destroy = () => keycon.destroy()
    const keydown = (keys: string[], callback: (e: any) => any, description?: any) => {
        keycon.keydown(keys, addCallback("keydown", keys, callback, description));
    }
    const keyup = (keys: string[], callback: (e: any) => any, description?: any) => {
        keycon.keyup(keys, addCallback("keyup", keys, callback, description));
    }

    return {
        keycon,
        keylist,
        enable,
        disable,
        keydown,
        keyup,
        destroy,
    };
}

export default createKeyManager()
