const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const isDevelopment = process.env.NODE_ENV !== 'production';
const isDevServer = process.env.WEBPACK_SERVE === 'true' || process.argv.includes('serve');

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    
    entry: {
        webview: isDevServer ? './src/webview/dev-app.tsx' : './src/webview/index.tsx'
    },
    
    output: {
        path: path.resolve(__dirname, 'out', 'webview'),
        filename: '[name].js',
        clean: true
    },
    
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.webview.json',
                        transpileOnly: true
                    }
                },
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader']
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource'
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource'
            }
        ]
    },
    
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@webview': path.resolve(__dirname, 'src/webview'),
            '@protocol': path.resolve(__dirname, 'src/protocol'),
            '@gui': path.resolve(__dirname, 'gui/src')
        }
    },
    
    plugins: [
        new HtmlWebpackPlugin({
            template: isDevServer ? './src/webview/dev-server.html' : './src/webview/index.html',
            chunks: ['webview'],
            filename: 'index.html',
            inject: 'body', // Always inject scripts
            templateParameters: {
                cspSource: isDevServer ? '' : '${cspSource}' // No CSP for dev server
            }
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
        })
    ],
    
    devtool: isDevelopment ? 'source-map' : false,
    
    // VS Code specific optimizations
    optimization: {
        // Bundle everything into a single file for VS Code webview
        splitChunks: false
    },
    
    // Development server (for testing outside VS Code)
    devServer: {
        static: {
            directory: path.join(__dirname, 'out/webview')
        },
        compress: true,
        port: 9000,
        hot: true
    }
};