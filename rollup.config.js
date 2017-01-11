import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import replace from 'rollup-plugin-replace'

export default {
  entry: 'src/js/main.js',
  format: 'iife',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      babelrc: false,
      presets: [
        ['es2015', {modules: false}]
      ],
      plugins: ['external-helpers', 'transform-object-rest-spread']
    }),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs({
      include: 'node_modules/**'
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    uglify()
  ],
  dest: 'dist/js/main.js'
}
