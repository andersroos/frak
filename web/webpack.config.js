let path = require('path');

module.exports = {
    entry: './gui.js',
//    output: {
//        filename: 'gui.js',
//        path: path.resolve(__dirname, 'dist'),
//    },
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        port: 8000,
    },
};
