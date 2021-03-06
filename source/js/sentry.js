/* global NODE_ENV APP DEBUG VERBOSE */
import * as Sentry from '@sentry/browser';

if ((NODE_ENV === 'production' || DEBUG) && APP.SENTRY.dsn) {
    const sentryCheckIgnore = (event) => {
        // Detect if we got a ReportingObserver event
        if (event?.message?.indexOf('ReportingObserver') === 0) {
            // And check whether sourceFile points to chrome-extension.
            if (event?.extra?.body?.sourceFile?.indexOf('chrome-extension') === 0) {
                return true;
            }
        }
        return false;
    };

    Sentry.init({
        debug: DEBUG || false,
        dsn: APP.SENTRY.dsn,
        beforeSend(event) {
            if (sentryCheckIgnore(event)) {
                if (VERBOSE) {
                    console.log('[sentry]', event);
                }
                return null;
            }
            return event;
        },
        ignoreErrors: APP.SENTRY.ignoreErrors || [],
        blacklistUrls: APP.SENTRY.blacklistUrls || [],
        whitelistUrls: APP.SENTRY.whitelistUrls || [],
    });
}
