import {dependencies} from './package.json';

export default {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/widget-installer.cjs',
            format: 'cjs',
            exports: 'default'
        },
        {
            file: 'dist/widget-installer.esm.js',
            format: 'es',
            exports: 'default'
        }
    ],
    external: ['path', 'fs', 'lodash/get', ...Object.keys(dependencies)],
};
