'use strict';
var yosay = require('yosay');

module.exports = function (app) {
  app.insight.track('yoyo', 'exit');

  var PADDING = 5;
  var url = 'http://yeoman.io';
  var maxLength = url.length + PADDING;
  var newLine = ' '.repeat(maxLength);

  console.log(yosay(
    'Bye from us!' +
    newLine +
    'Chat soon.' +
    newLine +
    'Yeoman team ' + url,
    {maxLength: maxLength}
  ));
};
