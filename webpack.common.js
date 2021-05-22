const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPartialsPlugin = require("html-webpack-partials-plugin");

module.exports = (env) => {
    let config = {
        entry: './src/index.ts',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.(scss)$/,
                    use: [{
                        loader: 'style-loader', // inject CSS to page
                    }, {
                        loader: 'css-loader', // translates CSS into CommonJS modules
                    }, {
                        loader: 'postcss-loader', // Run post css actions
                    }, {
                        loader: 'sass-loader' // compiles Sass to CSS
                    }]
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.scss'],
        },
        plugins: [
            new HtmlWebpackPlugin({
                title: 'RAM-QR-Code scanneur',
                template: "./src/index.html"
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {from: "src/config.json"},
                    {from: "src/i18nextify.min.js"},
                    {from: "src/locales/fr/translation.json", to: "locales/fr/"},
                    {from: "src/locales/en/translation.json", to: "locales/en/"}
                ]
            }),
        ],
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist'),
            clean: true,
            publicPath: '/',
        },
    };

    if (env.GA_PROPERTY_ID) {
        console.log("Include Google Analytics partial...");
        config.plugins.push(new HtmlWebpackPartialsPlugin({
            path: path.join(__dirname, './partials/analytics.html'),
            location: 'head',
            priority: 'high',
            options: {
                // Note: Update this to your property ID
                ga_property_id: env.GA_PROPERTY_ID
            }
        }));
    }

    return config;
};
