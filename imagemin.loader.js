const path = require('path');
const util = require('util');
const imagemin = require('imagemin');
const loaderUtils = require('loader-utils');
const __cache__ = {};

module.exports = function imageminLoader(content) {
    this.cacheable && this.cacheable();

    const padSize = 60;
    const callback = this.async();
    const cacheKey = this.resourcePath + '?' + content.length;
    const resourcePath = path.relative(__dirname, this.resourcePath).replace(/\\/g, '/');

    if (cacheKey in __cache__) {
        console.log(util.format('Imagemin:\t%s    %d [cache]', resourcePath.padStart(padSize), __cache__[cacheKey].length));
        callback(null, __cache__[cacheKey]);
        return;
    }

    imagemin.buffer(content, {
        plugins: [
            require('imagemin-gifsicle')({
                // https://github.com/imagemin/imagemin-gifsicle
            }),
            require('imagemin-jpegtran')({
                // https://github.com/imagemin/imagemin-jpegtran
            }),
            require('imagemin-svgo')({
                // https://github.com/imagemin/imagemin-svgo
            }),
            require('imagemin-pngquant')({
                // https://github.com/imagemin/imagemin-pngquant
            }),
        ],
    }).then((data) => {
        let delta = data.length - content.length;
        if (delta > 0) {
            this.emitWarning(util.format('Imagemin:\t%s    +%d bytes', resourcePath.padStart(padSize), delta));
            __cache__[cacheKey] = content;
            callback(null, content);
        } else if (delta === 0) {
            console.log(util.format('Imagemin:\t%s    %d bytes', resourcePath.padStart(padSize), 0));
            __cache__[cacheKey] = content;
            callback(null, content);
        } else {
            console.log(util.format('Imagemin:\t%s    %d bytes', resourcePath.padStart(padSize), delta));
            __cache__[cacheKey] = data;
            callback(null, data);
        }
    }).catch((err) => {
        console.log(util.format('Imagemin:\t%s    error', resourcePath.padStart(padSize)));
        callback(err);
    });
};

module.exports.raw = true;
