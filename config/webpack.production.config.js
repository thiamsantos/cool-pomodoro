const webpack = require('webpack')
const path = require('path')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const cssNext = require('postcss-cssnext')
const cssVariables = require('./css-variables')
const stylelint = require('stylelint')

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
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: 'style-loader',
          loader: 'css-loader?minimize&localIdentName=[path][hash:base64:5]&modules&importLoaders=1!postcss-loader'
          })
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('main.css'),
    new webpack.LoaderOptionsPlugin({
      options: {
        context: path.join(__dirname, '..'),
        postcss: [
          stylelint({
            configFile: 'config/stylelint.config.js'
          }),
          cssNext({
            features: {
              customProperties: {variables: cssVariables}
            }
          })
        ]
      }
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.UglifyJsPlugin()
  ]
}
