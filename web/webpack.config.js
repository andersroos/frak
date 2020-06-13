module.exports = {
    entry: {
        main: './main.js',
        dispatcher: './dispatcher.js',
        worker: './worker.js'
    },
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        port: 8000,
        // hot: false,
        inline: false,
    },
};
