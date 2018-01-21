const path = require('path');
const slash = require('slash');

const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');
const weblog = require('webpack-log');

const nunjucks = require('nunjucks');
const frontMatter = require('front-matter');
const deepAssign = require('deep-assign');

const posthtml = require('posthtml');
const posthtmlRender = require('posthtml-render');
const posthtmlCommentAfter = require('posthtml-comment-after');

const SVGO = require('svgo');
const svgoConfig = require('./svgo.config.js');
const deasync = require('deasync');

const logger = weblog({ name: 'loader-html' });

const DEFAULT_OPTIONS = {
    context: {},
    environment: {
        autoescape: true,
        trimBlocks: true,
        lstripBlocks: false,
        watch: false,
    },
    noCache: true,
    requireTags: {
        img: ['src', 'data-src', 'lowsrc', 'srcset', 'data-srcset'],
        source: ['srcset', 'data-srcset'],
        image: ['href', 'xlink:href'],
    },
    requireIgnore: /^(\w+[:]|\/\/)/i,
    requireReplace: {},
    searchPath: './source',
    svgo: svgoConfig,
    svgoEnabled: true,
};

const SRC_SEPARATOR = /\s+/;
const SRCSET_SEPARATOR = /\s*,\s*/;
const IGNORE_PATTERN = /^\{\{.*\}\}$/;
const REQUIRE_PATTERN = /\{\{ require\([0-9\\.]+\) \}\}/g;
const RANDOM_REQUIRE = () => `{{ require(${Math.random()}${Math.random()}) }}`;

const OPTIONS_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        context: { type: 'object' },
        environment: { type: 'object' },
        noCache: { type: 'boolean' },
        requireTags: {
            type: 'object',
            properties: {
                prop: {
                    type: 'object',
                    properties: {
                        prop: { type: 'string' },
                    },
                },
            },
        },
        requireIgnore: { instanceof: 'RegExp' },
        requireReplace: { type: 'object' },
        searchPath: { type: 'string' },
        svgo: { type: 'object' },
        svgoEnabled: { type: 'boolean' },
    },
};

function processHtml(html, options, loaderCallback) {
    const parser = posthtml();
    if (options.requireTags && Object.keys(options.requireTags).length) {
        parser.use((tree) => {
            const expression = Object.keys(options.requireTags).map(tag => ({
                tag,
                attrs: options.requireTags[tag].reduce((attrs, attr) => ({
                    ...attrs,
                    [attr]: true,
                }), {}),
            }));
            tree.match(expression, (node) => {
                options.requireTags[node.tag].forEach((attr) => {
                    if (!(attr in node.attrs) || ('data-require-ignore' in node.attrs)) return;

                    const val = node.attrs[attr];
                    if (attr in ['srcset', 'data-srcset']) {
                        node.attrs[attr] = val.split(SRCSET_SEPARATOR).map((src) => {
                            const [url, size] = src.split(SRC_SEPARATOR, 2);
                            if (IGNORE_PATTERN.test(url) || options.requireIgnore.test(url)) return src;
                            return `${options.requireIdent(url)} ${size}`;
                        }).join(', ');
                    } else if (!IGNORE_PATTERN.test(val) && !options.requireIgnore.test(val)) {
                        node.attrs[attr] = options.requireIdent(val);
                    }
                });
                return node;
            });
            return tree;
        });
    }
    if (options.svgoEnabled) {
        const svgoInstance = new SVGO(options.svgo);
        parser.use((tree) => {
            tree.match({ tag: 'svg' }, (node) => {
                if ('data-svgo-ignore' in node.attrs) return node;

                let minifiedSvg;
                const originalSvg = posthtmlRender(node);
                logger.info(`svgo(${JSON.stringify(originalSvg.substr(0, 120))}…)`);

                svgoInstance.optimize(originalSvg).then((result) => {
                    minifiedSvg = result;
                }).catch((error) => {
                    minifiedSvg = { data: originalSvg };
                    return loaderCallback(error);
                });
                deasync.loopWhile(() => minifiedSvg === undefined);

                node.attrs = {};
                node.content = minifiedSvg.data;
                node.tag = false;

                return node;
            });
            return tree;
        });
    }
    parser.use(posthtmlCommentAfter());
    parser.process(html).then((result) => {
        let exportString = `export default ${JSON.stringify(result.html)};`;
        exportString = options.requireExport(exportString);
        loaderCallback(null, exportString);
    }).catch(loaderCallback);
}

module.exports = function HtmlLoader() {
    const loaderContext = this;
    const loaderCallback = loaderContext.async();

    const options = deepAssign({}, DEFAULT_OPTIONS, loaderUtils.getOptions(loaderContext));
    validateOptions(OPTIONS_SCHEMA, options, 'loader-html');

    const nunjucksLoader = new nunjucks.FileSystemLoader(options.searchPath, { noCache: options.noCache });
    const nunjucksEnvironment = new nunjucks.Environment(nunjucksLoader, options.environment);


    options.requireIdent = (url) => {
        let ident;
        do ident = RANDOM_REQUIRE();
        while (options.requireReplace[ident]);
        options.requireReplace[ident] = url;
        return ident;
    };
    options.requireExport = exportString => exportString.replace(REQUIRE_PATTERN, (match) => {
        if (!options.requireReplace[match]) return match;
        const url = options.requireReplace[match];
        logger.info(`require('${url}')`);
        const request = loaderUtils.urlToRequest(url, options.searchPath);
        return `"+require(${JSON.stringify(request)})+"`;
    });

    nunjucksEnvironment.addFilter('require', options.requireIdent);
    nunjucksEnvironment.addGlobal('require', options.requireIdent);

    const publicPath = ((options.context.APP || {}).PUBLIC_PATH || path.sep);
    const resourcePath = path.sep + path.relative(options.searchPath, loaderContext.resourcePath);

    nunjucksEnvironment.addGlobal('APP', options.context);
    nunjucksEnvironment.addGlobal('PAGE', {
        PUBLIC_PATH: slash(path.normalize(publicPath + resourcePath)),
        RESOURCE_PATH: slash(path.normalize(resourcePath)),
    });

    const nunjucksGetSource = nunjucksLoader.getSource;
    nunjucksLoader.getSource = function getSource(filename) {
        const templateSource = nunjucksGetSource.call(this, filename);
        const templateData = frontMatter(templateSource.src);
        const PAGE = nunjucksEnvironment.getGlobal('PAGE') || {};
        nunjucksEnvironment.addGlobal('PAGE', deepAssign({}, PAGE, templateData.attributes));
        templateSource.src = templateData.body;
        return templateSource;
    };

    logger.info(`processing '${loaderContext.resourcePath}'`);
    nunjucksEnvironment.render(loaderContext.resourcePath, {}, (error, result) => {
        if (error) {
            if (error.message) {
                error.message = error.message.replace(/^\(unknown path\)/, `(${loaderContext.resourcePath})`);
            }
            loaderCallback(error);
        } else {
            processHtml(result, options, loaderCallback);
        }
    });
};
