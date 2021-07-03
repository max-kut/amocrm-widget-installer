import {dependencies} from './package.json';

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/widget-installer.js',
        format: 'cjs',
        exports: 'default'
    },
    external: ['path', 'fs', 'lodash/get', ...Object.keys(dependencies)],
};
