'use strict';

exports.namespaceToName = function (val) {
  return val.replace(/(\w+):\w+/, '$1');
};

exports.alphaSort = function (a, b) {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
};
