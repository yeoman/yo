'use strict';

var yosay = require('yosay');

module.exports = function (app) {
  app.insight.track('yoyo', 'exit');

  var url = 'https://github.com/yeoman/yeoman#team';
  var maxLength = url.length;
  var newLine = new Array(maxLength).join(' ');

  console.log(
    '\n' +
    yosay(
      'Bye from us! Chat soon.' +
      newLine +
      newLine +
      'The Yeoman Team ' + url,
      { maxLength: maxLength }
    )
  );
};
