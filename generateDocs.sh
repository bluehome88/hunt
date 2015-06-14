#!/bin/bash
rm examples/public/documentation/ -r -f
node node_modules/jsdoc/jsdoc.js -c jsdoc.conf.json --pedantic -u tutorials/
echo "Documentation generated in examples/public/documentation"
