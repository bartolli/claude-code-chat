const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    target: 'node',
    mode: 'development',
    
    entry: {
        extension: './src/extension.ts'
    },
    
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
        devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    
    externals: {
        vscode: 'commonjs vscode'
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js']
        },
        alias: {
            '@core': path.resolve(__dirname, 'src/core'),
            '@services': path.resolve(__dirname, 'src/services'),
            '@state': path.resolve(__dirname, 'src/state'),
            '@protocol': path.resolve(__dirname, 'src/protocol'),
            '@streaming': path.resolve(__dirname, 'src/streaming'),
            '@types': path.resolve(__dirname, 'src/types'),
            '@utils': path.resolve(__dirname, 'src/utils')
        }
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: false,
                            compilerOptions: {
                                sourceMap: true
                            }
                        }
                    }
                ]
            }
        ]
    },
    
    optimization: {
        minimize: false,
        moduleIds: 'named',
        chunkIds: 'named',
        mangleExports: false
    },
    
    devtool: 'source-map',
    
    plugins: [
        new CopyPlugin({
            patterns: [
                { 
                    from: 'src/hooks', 
                    to: 'hooks',
                    globOptions: {
                        ignore: ['**/*.ts']
                    }
                },
                {
                    from: 'src/test/abort-test-utils.js',
                    to: 'test/abort-test-utils.js'
                }
            ]
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
            'process.env.DEBUG': JSON.stringify('true')
        }),
        new webpack.SourceMapDevToolPlugin({
            filename: '[file].map',
            exclude: /node_modules/
        })
    ],
    
    stats: {
        errorDetails: true,
        warnings: true,
        children: true
    }
};