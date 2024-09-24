import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';

const config = {
  entry: './src/homebridge-ui/public/index.ts',
  output: {
    filename: 'index.js?q=[contenthash]',
    path: path.resolve(__dirname, '..', '..', 'dist', 'homebridge-ui', 'public'),
    publicPath: './',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/homebridge-ui/public/index.html',
      filename: 'index.html',
      inject: 'body',
      templateParameters: {
        additionalScripts: `<script>
  // Ensure index.js is loaded and function is called
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderEcoFlowPluginConfig === 'function') {
      renderEcoFlowPluginConfig(homebridge);
    }
  });
</script>`,
      },
    }),
  ],
};

export default config;
