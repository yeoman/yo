'use strict';
var arrayUniq = require('array-uniq');

exports.namespaceToName = function (val) {
  return val.split(':')[0];
};

exports.generatorsFromEnv = function (env) {
  return arrayUniq(Object.keys(env.getGeneratorsMeta()).map(exports.namespaceToName));
};
