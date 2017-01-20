const webpack = require('webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const cssNext = require('postcss-cssnext')
const cssVariables = require('./config/css-variables')
const stylelint = require('stylelint')

module.exports = {
  entry: './app/main.js',
  output: {
    path: './build/assets',
    filename: 'main.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel',
      query: {
        presets: ['es2015'],
        plugins: ['transform-object-rest-spread']
      }
    }, {
      test: /\.css$/,
      loader: ExtractTextPlugin.extract('style-loader',
        'css-loader?modules&importLoaders=1&localIdentName=[local][hash:base64:5]!postcss-loader')
    }]
  },
  postcss() {
    return [
      stylelint({
        configFile: 'config/stylelint.config.js'
      }),
      cssNext({
        features: {
          customProperties: {variables: cssVariables}
        }
      })
    ]
  },
  plugins: [
    new ExtractTextPlugin('main.css'),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({sourcemap: false})
  ]
}
