//
// Entry point in the browser.
//

import Core from './core';
import Screen from './screen';

window.init = () => {
    console.info("setting up core and gui");
    
    const core = new Core();
    core.start();
};

