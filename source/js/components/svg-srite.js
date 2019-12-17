/* global NODE_ENV DEBUG */
const svg4everybody = require('svg4everybody');

const svgSprites = require.context('../../img/svg-sprite/', true, /\.svg$/);

if (NODE_ENV === 'development' || DEBUG) {
    console.log('[svg-sprite]', svgSprites.keys());
}

jQuery(($) => {
    svg4everybody();

    $(window).on('pushState replaceState', () => {
        // Barba events
        setTimeout(() => {
            svg4everybody();
        }, 0);
    });
});
