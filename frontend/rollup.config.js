import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import sourcemaps from 'rollup-plugin-sourcemaps'

export default {
    input: 'src/main.js',
    output: {
        file: '../static/script.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [
        sourcemaps(),
        commonjs(),
        nodeResolve(),
        babel({ babelHelpers: "bundled", inputSourceMap: false })
    ]
};