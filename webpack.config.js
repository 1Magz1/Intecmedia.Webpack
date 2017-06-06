const util = require("util"), path = require("path");
const webpack = require("webpack");

const IS_PROD = process.argv.indexOf("-p") !== -1;
console.log("Config enviroment: " + (IS_PROD ? "production" : "development"));

const extract = new (require("extract-text-webpack-plugin"))({
    filename: "./assets/app.min.css"
});

const banner = new String;
banner.toString = () => {
    return util.format("Generated by Intecmedia.Webpack: %s | %s | [hash]", new Date().toISOString(), IS_PROD ? "production" : "development");
};

const sassIncludePaths = [
    path.resolve("./node_modules/bootstrap-sass/assets/stylesheets")
];

module.exports = {

    entry: [
        "./app/app.js"
    ],

    output: {
        path: __dirname,
        filename: "./assets/app.min.js"
    },

    plugins: (IS_PROD ? [
        // prod-only
        new webpack.optimize.UglifyJsPlugin({
            banner: banner,
            beautify: false,
            comments: false
        })
    ] : [
        // dev-only
    ]).concat([
        // dev-and-prod
        new webpack.BannerPlugin({
            banner: banner
        }),
        new webpack.DefinePlugin({
            "process.env": {
                "NODE_ENV": (IS_PROD ? "production" : "development")
            }
        }),
        extract,
        new webpack.ProvidePlugin({
            "$": "jquery",
            "jQuery": "jquery",
        })
    ]),

    devtool: (IS_PROD ? "" : "inline-source-map"),

    resolve: {
        alias: {
            "bootstrap": "bootstrap-sass/assets/javascripts/bootstrap"
        }
    },

    module: {
        rules: [
            // javascript loaders
            {
                test: /\.js$/,
                include: /node_modules/,
                loader: "imports-loader",
                options: {
                    "$": "jquery",
                    "jQuery": "jquery"
                }
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "babel-loader",
                options: {
                    presets: ["env"]
                }
            },
            // image loaders
            {
                test: /\.(jpe?g|png|gif|svg)$/i,
                exclude: /fonts/,
                loaders: [
                    {
                        loader: "url-loader",
                        options: {
                            limit: 32 * 1024 // IE8 cannot handle a data-uri larger than 32KB
                        }
                    },
                    {
                        loader: "file-loader",
                        options: {
                            name: "assets/img/[name].[ext]?v=[hash]"
                        }
                    },
                    {
                        loader: "image-webpack-loader",
                        options: {
                            bypassOnDebug: !IS_PROD
                        }
                    }
                ]
            },
            // font loaders
            {
                test: /\.(eot|woff|woff2|ttf|svg)(\?v=.+)?$/,
                loaders: [
                    {
                        loader: "file-loader",
                        options: {
                            name: "assets/fonts/[name].[ext]?v=[hash]"
                        }
                    }
                ]
            },
            // css loaders
            {
                test: /\.s?css$/,
                loader: extract.extract({
                    fallback: [
                        {
                            loader: "style-loader",
                            options: {
                                sourceMap: !IS_PROD
                            }
                        }
                    ],
                    use: [
                        {
                            loader: "css-loader",
                            options: {
                                importLoaders: true,
                                sourceMap: !IS_PROD
                            }
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                data: "$NODE_ENV: " + (IS_PROD ? "production" : "development") + ";",
                                indentWidth: 4,
                                includePaths: sassIncludePaths,
                                sourceMapEmbed: !IS_PROD,
                                sourceMapContents: !IS_PROD
                            }
                        },
                        {
                            loader: "postcss-loader",
                            options: {
                                sourceMap: !IS_PROD,
                                plugins: [
                                    require("postcss-cssnext")({
                                        warnForDuplicates: false
                                    }),
                                    require("css-mqpacker")({
                                        sort: true
                                    }),
                                    require("cssnano")({
                                        discardComments: {
                                            removeAll: true
                                        }
                                    })
                                ]
                            }
                        }
                    ]
                })
            }
        ]
    }

};