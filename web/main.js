//
// Entry point in the browser.
//

import Core from './core';
import Screen from './screen';

window.init = () => {
    console.info("setting up core and gui");
    
    const screen = new Screen();
    const core = new Core(screen);
    core.start();
};

