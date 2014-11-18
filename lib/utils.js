'use strict';

exports.namespaceToName = function (val) {
  return val.replace(/(\w+):\w+/, '$1');
};
