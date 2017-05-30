const path = require('path')

module.exports = {
  entry: './app/main.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public/assets')
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
            plugins: ['transform-object-rest-spread']
          }
        }
      }
    ]
  }
}
