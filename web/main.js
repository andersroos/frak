//
// Entry point in the browser.
//

import Core from './core';
import {X_SIZE, Y_SIZE} from "./dimensions";

window.init = () => {
    console.info("setting up core and gui");
    
    const core = new Core();
    
    // Full.
    core.setCoordinates(
        -2,
        4 / X_SIZE,
        -2,
        4 / Y_SIZE,
    );
    
    // // "Broken" histogram.
    // core.setCoordinates(
    //     0.40286747167707915,
    //     1.4672303879337928e-11,
    //     -0.3501103227933188,
    //     1.4672303879337928e-11,
    // );

    // // Nice slow area.
    // core.setCoordinates(
    //     0.01311636238095419,
    //     5.5964300526380535e-15,
    //     0.6325883646614131,
    //     5.5964300526380535e-15,
    // );

    core.start();
    core.gui.colorScalingInput.set(1);
};

