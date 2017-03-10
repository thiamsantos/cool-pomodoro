const webpack = require('webpack')
const path = require('path')

process.env.NODE_ENV = 'production'

module.exports = {
  entry: './app/main.js',
  output: {
    path: './build/assets',
    filename: 'main.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: [['es2015', {loose: true, modules: false}]],
            plugins: ['transform-object-rest-spread']
          }
        }]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin()
  ]
}
