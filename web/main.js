//
// Entry point in the browser.
//


import Core from './core';
import {X_SIZE, Y_SIZE} from "./dimensions";


const zoom_out = ({x0_delta, y0_delta, x0_start_index, y0_start_index, z}) => {
    const back_out_factor = (1 - z) / (2 * z);
    x0_start_index = Math.round(x0_start_index / z) + X_SIZE * back_out_factor;
    x0_delta = x0_delta * z;
    y0_start_index = Math.round(y0_start_index / z) + Y_SIZE * back_out_factor;
    y0_delta = y0_delta * z;
    return {x0_start_index, x0_delta, y0_start_index, y0_delta};
};


window.init = () => {
    console.info("setting up core and gui");

    const core = new Core();

    core.whenBackendConnected(() => core.startBenchmark00());
};
