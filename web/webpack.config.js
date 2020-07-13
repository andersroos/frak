const webpack = require("webpack");

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
        host: '0.0.0.0',
        // hot: false,
        inline: false,
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env.AWS_ACCESS_KEY_ID": JSON.stringify(process.env.AWS_ACCESS_KEY_ID),
            "process.env.AWS_ACCESS_KEY_SECRET": JSON.stringify(process.env.AWS_ACCESS_KEY_SECRET),
        }),
    ]
};
