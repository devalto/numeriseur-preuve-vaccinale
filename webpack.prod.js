const {merge} = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common(process.env), {
    mode: 'production',
});