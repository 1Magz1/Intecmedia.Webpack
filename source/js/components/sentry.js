/* global NODE_ENV APP */
if (NODE_ENV === 'production' && APP.SENTRY_DSN) {
    // eslint-disable-next-line global-require
    const { init: sentryInit } = require('@sentry/browser');

    sentryInit({
        dsn: APP.SENTRY_DSN,
        beforeSend(event) {
            // Detect if we got a ReportingObserver event
            if (event?.message?.indexOf('ReportingObserver') === 0) {
                // And check whether sourceFile points to chrome-extension.
                if (event?.extra?.body?.sourceFile?.indexOf('chrome-extension') === 0) {
                    return null;
                }
            }
            // Otherwise, just let it through
            return event;
        },
        ignoreErrors: [],
        blacklistUrls: [],
        whitelistUrls: [],
    });
}
