module.exports = {
    parser: 'babel-eslint',
    env: {
        browser: true,
        es6: true,
        node: true,
        mocha: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaFeatures: {
            experimentalObjectRestSpread: true,
        },
        sourceType: 'module',
    },
    plugins: [
    ],
    rules: {
        indent: [
            2,
            'tab',
        ],
        'linebreak-style': [
            2,
            'unix',
        ],
        quotes: [
            2,
            'single',
        ],
        semi: [
            2,
            'always',
        ],
        'comma-dangle': [2, 'always-multiline'],
    },
};
