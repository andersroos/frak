import {ColorMapper, INFINITE, NOT_CALCULATED} from "./color";
import {Screen} from "./screen";

const SCREEN_UPDATE_DELAY_MS = 40;

export default class Gui {

    init(core) {
        this.core = core;
        
        this.paintTime = 0;
        this.paintCount = 0;
    }
    
}
