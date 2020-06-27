
// Format int number in base. Pad to padTo chars with padChar, add space every space char (0 = off) using spaceChar. Pads first the adds spaces.
// NOTE: Does not support negative numbers.
export const formatInt = (number, {base=10, padTo=0, padChar=' ', space=0, spaceChar=' '}) => {
    let str = Math.round(number).toString(base);
    while (str.length < padTo) {
        str = padChar + str;
    }
    if (space <= 0) {
        return str;
    }
    
    let res = '';
    for (let i = str.length - 1, c = 0; i >= 0; --i, ++c) {
        res = str[i] + ((c % space) === 0 && c !== 0 ? spaceChar : '') + res;
    }
    return res;
};
window.formatInt = formatInt;

const suffixes = [
    {limit: 1e12, suffix: 'T'},
    {limit: 1e9, suffix: 'G'},
    {limit: 1e6, suffix: 'M'},
    {limit: 1e3, suffix: 'k'},
    {limit: 1e-0,suffix: ' '},
    {limit: 1e-3,suffix: 'm'},
    {limit: 1e-6,suffix: 'u'},
    {limit: 1e-9,suffix: 'n'},
];


const normalizeWithSuffix = number => {
    if (number === 0) {
        return {normalized: number, suffix: ' '};
    }
    
    const {limit, suffix} = suffixes.find(({limit, suffix}) => number > limit);
    return {normalized: number / limit, suffix};
};


// Format float number with dec decimals. Pad to padTo chars with padChar. If human show number with closest suffix, then dec will be used to show this many digits, but at least 3.
// NOTE: Does not support negative numbers.
export const formatFloat = (number, {dec=2, padTo=0, padChar=' ', human=false}) => {
    let str;
    if (human) {
        dec = Math.max(dec, 3);
        const {normalized, suffix} = normalizeWithSuffix(number);
        
        const fullCount = normalized === 0 ? 1 : (Math.floor(Math.log10(normalized)) + 1);
        const decimals = Math.max(0, dec - fullCount);
        const factor = Math.pow(10, decimals);
        const rounded = Math.round(normalized * factor) / factor;
        if (decimals === 0) {
            str = rounded.toString() + ". " + suffix;
        }
        else {
            str = rounded.toFixed(decimals) + " " + suffix;
        }
    }
    else {
        str = number.toFixed(dec);
    }
    
    while (str.length < padTo) {
        str = padChar + str;
    }
    return str;
};
window.formatFloat = formatFloat;


export const calculateWeight = (statistics, max_n) => statistics.infiniteCount * max_n + statistics.sumDepth;
