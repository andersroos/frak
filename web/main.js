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

    // // Full.
    // let x0_delta = 4 / X_SIZE;
    // let y0_delta = 4 / Y_SIZE;
    // let x0_start_index = Math.round(-2 / x0_delta);
    // let y0_start_index = Math.round(-2 / y0_delta);

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
    // let x0_delta = 4.000367762006723e-15;
    // let y0_delta = 4.000367762006723e-15;
    // let x0_start_index =  3278789141870;
    // let y0_start_index = 158132552379221;
    // let max_n = 262144;
    //
    // core.configure({id: Date.now(), x0_start_index, x0_delta, y0_start_index, y0_delta, max_n});
    // core.configure(out);
    // core.pushHistory();
    // core.start();
    
    core.startBenchmark01();
};

/*

// 40s chrome*js
let x0_delta = 2.3159865486788074e-16;
let y0_delta = 2.3159865486788074e-16;
let x0_start_index = 56634017984540;
let y0_start_index = 2731399131086267;
let max_n = 1048576;

// 12s chrome*js
    let x0_delta = 4.000367762006723e-15;
    let y0_delta = 4.000367762006723e-15;
    let x0_start_index =  3278789141870;
    let y0_start_index = 158132552379221;
    let max_n = 262144;

 */