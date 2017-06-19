/* eslint global-require: "off" */
const glob = require('glob');
const path = require('path');
const slash = require('slash');
const webpack = require('webpack');

const DEBUG = 'DEBUG' in process.env && parseInt(process.env.DEBUG, 10) > 0;
const PROD = process.argv.indexOf('-p') !== -1;
const NODE_ENV = PROD ? 'production' : 'development';
const USE_SOURCE_MAP = DEBUG && !PROD;

const BUILD_DIR = path.resolve(__dirname, 'build');

console.log(`Output dir: ${BUILD_DIR}`);
console.log(`Enviroment: ${NODE_ENV}`);
console.log(`Debug: ${DEBUG ? 'enabled' : 'disabled'}`);
console.log(`Source maps: ${USE_SOURCE_MAP ? 'enabled' : 'disabled'}`);
console.log('---\nWebpack running...');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StyleLintPlugin = require('stylelint-webpack-plugin');
const WebpackNotifierPlugin = require('webpack-notifier');

const banner = new String(''); // eslint-disable-line no-new-wrappers
banner.toString = () => `Generated by Intecmedia.Webpack: ${new Date().toISOString()} | ${NODE_ENV} | [chunkhash]`;

const resourceName = (prefix, hash = false) => {
    prefix = path.basename(prefix);
    hash = (hash ? '?[hash]' : '');
    return (resourcePath) => {
        let url = slash(path.relative(path.join(__dirname, 'source'), resourcePath));
        if (url.startsWith(prefix + '/')) {
            return url + hash;
        }
        if (url.startsWith('../node_modules/')) {
            let [, , modulename] = url.split('/', 3);
            return slash(path.join(prefix, modulename, '[name].[ext]' + hash));
        }
        return slash(path.join(prefix, '[name].[ext]' + hash));
    };
};

module.exports = {

    watchOptions: {
        ignored: /node_modules/,
    },

    devServer: {
        overlay: true,
        compress: false,
    },

    entry: {
        vendor: [
            'jquery',
            'babel-polyfill',
            './source/js/vendor.js',
        ],
        app: './source/js/app.js',
    },

    output: {
        path: BUILD_DIR,
        filename: 'js/app.min.js',
    },

    performance: {
        hints: PROD && !DEBUG ? 'error' : false,
        maxAssetSize: 512 * 1024,
        maxEntrypointSize: 512 * 1024,
    },

    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            filename: 'js/vendor.min.js',
        }),
        new ExtractTextPlugin({
            filename: 'css/app.min.css',
            allChunks: true,
        }),
        new webpack.BannerPlugin({
            banner: banner,
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            _: 'underscore',
        }),
        new webpack.DefinePlugin({
            'NODE_ENV': JSON.stringify(NODE_ENV),
        }),
        new StyleLintPlugin({
            fix: true,
            files: ['**/*.scss'],
            syntax: 'scss',
        }),
        new WebpackNotifierPlugin({
            alwaysNotify: true,
        }),
        ...(glob.sync('./source/*.html').map((template) => {
            return new HtmlWebpackPlugin({
                filename: path.basename(template),
                template: template,
                inject: false,
                minify: false,
            });
        })),
    ],

    devtool: USE_SOURCE_MAP ? 'eval-source-map' : '',

    resolve: {
        alias: {
            modernizr: path.resolve(__dirname, '.modernizrrc'),
        },
    },
    resolveLoader: {
        alias: {
            'imagemin-loader': path.resolve(__dirname, 'imagemin-loader.js'),
            'cssurl-loader': path.resolve(__dirname, 'cssurl-loader.js'),
        },
    },

    module: {
        rules: [
            // html loaders
            {
                test: /\.html$/,
                loader: 'handlebars-loader',
                options: {
                    inlineRequires: '/img/',
                },
            },
            // javascript loaders
            {
                test: /\.modernizrrc$/,
                loader: 'modernizr-loader!json-loader',
            },
            {
                test: /\.js$/,
                include: /node_modules/,
                loader: 'imports-loader',
                options: {
                    $: 'jquery',
                    jQuery: 'jquery',
                },
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loaders: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['env'],
                            forceEnv: NODE_ENV,
                            cacheDirectory: !PROD,
                        },
                    },
                    {
                        loader: 'eslint-loader',
                        options: {
                            fix: true,
                            cache: !PROD,
                        },
                    },
                ],
            },
            // image loaders
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                exclude: /(fonts|font)/,
                loaders: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: resourceName('img', false),
                        },
                    },
                    {
                        loader: 'imagemin-loader',
                    },
                ],
            },
            // font loaders
            {
                test: /\.(eot|woff|woff2|ttf|svg)(\?v=.+)?$/,
                exclude: /(img|images)/,
                loader: 'file-loader',
                options: {
                    name: resourceName('fonts', true),
                },
            },
            // css loaders
            {
                test: /\.s?css$/,
                loaders: (PROD ? [] : ['css-hot-loader']).concat(ExtractTextPlugin.extract({
                    publicPath: '../',
                    fallback: [
                        {
                            loader: 'style-loader',
                            options: {
                                sourceMap: USE_SOURCE_MAP,
                            },
                        },
                    ],
                    use: [
                        {
                            loader: 'cssurl-loader',
                            options: {
                                test: /\.(jpe?g|png|gif|svg)$/i,
                                exclude: /(fonts|font)/,
                                limit: 32 * 1024,
                                name: resourceName('img', false),
                            },
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: USE_SOURCE_MAP,
                                minimize: (PROD ? {
                                    discardComments: {
                                        removeAll: true,
                                    },
                                } : false),
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                sourceMap: USE_SOURCE_MAP ? 'inline' : false,
                                plugins: [
                                    require('postcss-cssnext')(),
                                    require('css-mqpacker')(),
                                ],
                            },
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                data: `$NODE_ENV: ${NODE_ENV};`,
                                indentWidth: 4,
                                sourceMap: USE_SOURCE_MAP ? 'inline' : false,
                                sourceMapEmbed: USE_SOURCE_MAP,
                                sourceComments: USE_SOURCE_MAP,
                            },
                        },
                    ],
                })),
            },
        ],
    },

};
