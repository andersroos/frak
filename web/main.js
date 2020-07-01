//
// Entry point in the browser.
//

import Core from './core';
import {X_SIZE, Y_SIZE} from "./dimensions";

window.init = () => {
    console.info("setting up core and gui");
    
    const core = new Core();

    // Full.
    let x0_delta = 4 / X_SIZE;
    let y0_delta = 4 / Y_SIZE;
    let x0_start_index = Math.round(-2 / x0_delta);
    let y0_start_index = Math.round(-2 / y0_delta);

    // // "Broken" histogram.
    // let x0_delta = 1.4672303879337928e-11;
    // let y0_delta = 1.4672303879337928e-11;
    // let x0_start_index = Math.round(0.40286747167707915 / x0_delta);
    // let y0_start_index = Math.round(-0.3501103227933188 / y0_delta);

    // // Nice slow area.
    // let x0_delta = 5.5964300526380535e-15;
    // let y0_delta = 5.5964300526380535e-15;
    // let x0_start_index = Math.round(0.01311636238095419 / x0_delta);
    // let y0_start_index = Math.round(0.6325883646614131 / y0_delta);
    
    core.configure({id: Date.now(), x0_start_index, x0_delta, y0_start_index, y0_delta});
    core.pushHistory();
    core.start();
};

