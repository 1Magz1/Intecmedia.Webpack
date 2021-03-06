/* eslint-env node */
/* eslint max-len: "off" */

const ENV = require('./app.env.js');
const BROWSERSYNC = require('./browsersync.config.js');

module.exports = {
    TITLE: '$APP.TITLE$',
    SHORT_NAME: '$APP.SHORT_NAME$',
    DESCRIPTION: '$APP.DESCRIPTION$',
    PUBLIC_PATH: '/', // for relative use './'
    USE_FAVICONS: true,
    LANGUAGE: 'ru',
    START_URL: '/?utm_source=app_manifest',
    THEME_COLOR: '#fff',
    BACKGROUND_COLOR: '#fff',
    HTML_PRETTY: true,
    SENTRY: {
        dsn: '',
        ignoreErrors: [],
        blacklistUrls: [],
        whitelistUrls: [],
    },
};

module.exports.ENV = ENV;
module.exports.BROWSERSYNC = BROWSERSYNC;
