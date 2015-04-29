'use strict';
var yosay = require('yosay');
var repeating = require('repeating');

module.exports = function (app) {
  app.insight.track('yoyo', 'exit');

  var PADDING = 5;
  var url = 'http://yeoman.io';
  var maxLength = url.length + PADDING;
  var newLine = repeating(' ', maxLength);

  console.log(yosay(
    'Bye from us!' +
    newLine +
    'Chat soon.' +
    newLine +
    'Yeoman team ' + url,
    {maxLength: maxLength}
  ));
};
