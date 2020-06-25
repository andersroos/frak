//
// Entry point in the browser.
//

import Core from './core';
import {X_SIZE, Y_SIZE} from "./dimensions";

window.init = () => {
    console.info("setting up core and gui");
    
    const core = new Core();
    
    // core.colors.parse("00ff00-#90-ffffff-#90-ff0000-#90-00ff00");
    // core.colors.parse("000044-#32-0000ff-#64-ffff00-#64-ffffff");
    core.gui.colors.parse("9400d3-#32-4b0082-#32-0000ff-#32-00ff00-#32-ffff00-#32-ff7f00-#32-ff0000-#32-9400d3");

    // // Full.
    // core.setCoordinates(
    //     -2,
    //     4 / X_SIZE,
    //     -2,
    //     4 / Y_SIZE,
    // );
    
    // // "Broken" histogram.
    // core.setCoordinates(
    //     0.40286747167707915,
    //     1.4672303879337928e-11,
    //     -0.3501103227933188,
    //     1.4672303879337928e-11,
    // );

    // Nice slow area.
    core.setCoordinates(
        0.01311636238095419,
        5.5964300526380535e-15,
        0.6325883646614131,
        5.5964300526380535e-15,
    );

    core.start();
    core.gui.colorScalingInput.set(1);
};

