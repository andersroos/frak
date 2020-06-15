//
// Entry point in the browser.
//

import Gui from './gui.js';
import Core from './core.js';

window.init = () => {
    console.info("setting up core and gui");
    const gui = new Gui();
    const core = new Core(gui);
    gui.init(core);
    core.start();
};

