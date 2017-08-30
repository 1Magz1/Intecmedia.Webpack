const pretty = require('pretty');

const DEFAULT_OPTIONS = {
    ocd: false,
    unformatted: ['code', 'pre', 'em', 'strong', 'span'],
    indent_inner_html: true,
    indent_char: ' ',
    indent_size: 4,
    sep: '\n',
};

function HtmlPrettyPlugin(options) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
}

HtmlPrettyPlugin.prototype.apply = function HtmlPrettyPluginApply(compiler) {
    compiler.plugin('compilation', (compilation) => {
        compilation.plugin('html-webpack-plugin-after-html-processing', (htmlPluginData, callback) => {
            /* eslint no-param-reassign: "off" */
            htmlPluginData.html = pretty(htmlPluginData.html, this.options);
            callback(null, htmlPluginData);
        });
    });
};

module.exports = HtmlPrettyPlugin;