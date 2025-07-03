const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    target: 'node', // VS Code extensions run in a Node.js context
    mode: 'production',
    
    entry: {
        extension: './src/extension.ts'
    },
    
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    
    externals: {
        vscode: 'commonjs vscode' // the vscode module is provided by VS Code
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
                            transpileOnly: true
                        }
                    }
                ]
            }
        ]
    },
    
    optimization: {
        minimize: false // Keep code readable for debugging
    },
    
    devtool: 'source-map',
    
    plugins: [
        new CopyPlugin({
            patterns: [
                { 
                    from: 'src/hooks', 
                    to: 'hooks',
                    globOptions: {
                        ignore: ['**/*.ts'] // Only copy JS files
                    }
                }
            ]
        })
    ]
};