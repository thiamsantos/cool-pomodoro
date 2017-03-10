import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import uglify from 'rollup-plugin-uglify'

export default {
  entry: 'app/main.js',
  format: 'iife',
  plugins: [
    babel({
      exclude: 'node_modules/**',
      babelrc: false,
      presets: [
        ['es2015', {loose:true, modules: false}]
      ],
      plugins: ['transform-object-rest-spread', 'external-helpers']
    }),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs({
      include: 'node_modules/**',
      namedExports: {
        'aphrodite/no-important': ['StyleSheet', 'css']
      }
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) || JSON.stringify('development')
    }),
    process.env.NODE_ENV === 'production' && uglify()
  ],
  dest: 'build/assets/main.js'
}
