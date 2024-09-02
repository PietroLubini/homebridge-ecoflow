const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/homebridge-ui/public/index.js',
  output: {
    filename: 'index.js?q=[contenthash]',
    path: path.resolve(__dirname, 'dist', 'homebridge-ui', 'public'),
    publicPath: './',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/homebridge-ui/public/index.html',
      filename: 'index.html',
      inject: 'body',
    }),
  ],
};
