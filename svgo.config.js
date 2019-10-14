/* eslint-env node */
/* eslint "compat/compat": "off" */

const uniqueId = require('lodash.uniqueid');

const SvgoPrefixConfig = (prefix = false) => ({
    js2svg: { pretty: true },
    plugins: [
        {
            cleanupIDs: (prefix ? {
                prefix: {
                    toString() {
                        return uniqueId(prefix);
                    },
                },
                preserve: [], // ignore ids
                preservePrefixes: [], // ignore prefix ids
            } : false),
        },
        { convertShapeToPath: false },
        { removeViewBox: false },
        { removeUselessDefs: false },
    ],
});

const SvgoDefaultConfig = SvgoPrefixConfig('svgo-');

module.exports.SvgoPrefixConfig = SvgoPrefixConfig;
module.exports.SvgoDefaultConfig = SvgoDefaultConfig;
