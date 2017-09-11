#!/usr/bin/env node
"use strict";
var fs = require('fs');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2), { boolean: ["w", "suppresswarnings"] });
var defined = require('../lib/defined');
var defaultValue = require('../lib/defaultValue');
var enums = require('../lib/enums');
var generateMarkdown = require('../lib/generateMarkdown');
var refParser = require('json-schema-ref-parser');

if (!defined(argv._[0]) || defined(argv.h) || defined(argv.help)) {
    var help = 'Usage: node ' + path.basename(__filename) + ' [path-to-json-schema-file] [OPTIONS]\n' +
        '  -l,  --headerLevel        Top-level header. Default: 1\n' +
        '  -p,  --schemaPath         The path string that should be used when generating the schema reference paths.\n' +
        '  -a,  --autoLink           Aggressively auto-inter-link types referenced in descriptions.  Add =cqo to auto-link types that are in code-quotes only.\n' +
        '  -i                        An array of schema filenames (no paths) that should not get their own table of contents entry, nor type listing (they are just used for sharing properties across multiple other schemas)'
    '  -d,  --debug              Provide a path, and this will save out intermediate processing artifacts useful in debugging wetzel.' +
        '  -w,  --suppressWarnings   Will not print out WETZEL_WARNING strings indicating identified conversion problems. Default: false';
    process.stdout.write(help);
    return;
}

var filepath = argv._[0];
var schema = JSON.parse(fs.readFileSync(filepath));

var autoLink = enums.autoLinkOption.off;
switch (defaultValue(argv.a, argv.autoLink)) {
    case true:
        autoLink = enums.autoLinkOption.aggressive;
        break;
    case "=cqo":
    case "cqo":
        autoLink = enums.autoLinkOption.codeQuoteOnly;
        break;
}

// We're expecting users to pass in an array as a "string", but we aren't expecting them
// to pass it in as a correctly JSON-escaped string.  Therefore, we need to replace single
// or double-quotes with a backslash-double-quote, and then we can parse the object.
var ignorableTypesString = defaultValue(argv.i, '[]');
ignorableTypesString = ignorableTypesString.replace(/'/g, '\"');
ignorableTypesString = ignorableTypesString.replace(/"/g, '\"');
var ignorableTypes = JSON.parse(ignorableTypesString);


refParser.dereference(schema, { dereference: { circular: "ignore" }}, function (err, schemaPopulated) {
    if (err) {
        console.error(err);
    }
    else {
        // `schema` is just a normal JavaScript object that contains your entire JSON Schema,
        // including referenced files, combined into a single object
        schema = schemaPopulated;
        console.log("Finished loading refs");

        process.stdout.write(generateMarkdown({
            schema: schema,
            filePath: filepath,
            fileName: path.basename(filepath),
            basePath: path.dirname(filepath),
            headerLevel: defaultValue(defaultValue(argv.l, argv.headerLevel), 1),
            schemaRelativeBasePath: defaultValue(defaultValue(argv.p, argv.schemaPath), null),
            debug: defaultValue(defaultValue(argv.d, argv.debug), null),
            suppressWarnings: defaultValue(defaultValue(argv.w, argv.suppressWarnings), false),
            autoLink: autoLink,
            ignorableTypes: ignorableTypes
        }));
    }
});


