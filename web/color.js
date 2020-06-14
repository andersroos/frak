export const NOT_CALCULATED = 0xffffffff;
export const CALCULATING =    0xfffffffe;
export const NOT_FINAL =      0xfffffffd;
export const FAIL =           0xfffffffc;
export const INFINITE =       0xfffffffb;


// Convert a color to a 32 bit color with alpha in correct (strange) byte order.
const make32Col = col => {
    return col | 0xff000000;
};

const mapGradient = (fraction, from, to) => {
    const red = 0xff0000;
    const green = 0xff00;
    const blue = 0xff;
    let res = 0xff000000;
    res |= ((((to & red) - (from & red)) * fraction + (from & red)) & red) >> 16;
    res |= (((to & green) - (from & green)) * fraction + (from & green)) & green;
    res |= ((((to & blue) - (from & blue)) * fraction + (from & blue)) & blue) << 16;
    return res;
};


// Class representing a color mapper.
export class ColorMapper {

    // IDEA Add wrapping.
    // IDEA Make color mapper map on time and count making it able to do animations.
    // IDEA Always map on color making it possible to alter color mapper while calculating.
    // IDEA Maybe configuration of calculating col, fail col is not needed if flashing.

    constructor() {
        this.colFrom = 0xf0f0f0;
        this.colTo =   0x101010;
        this.maxCol = 64;
        
        this.specials = {
            [NOT_CALCULATED]: make32Col(0x101010),
            [CALCULATING]: make32Col(0xffffff),
            [NOT_FINAL]: make32Col(0x00ff00),
            [FAIL]: make32Col(0xff0000),
            [INFINITE]: make32Col(0x000000),
        };
    }

    mapColor(count) {
        if (count >= INFINITE) {
            return this.specials[count];
        }
        const col = count % this.maxCol;
        return mapGradient(col / this.maxCol, this.colFrom, this.colTo);
    }

}



