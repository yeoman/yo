'use strict';
var util = require('util');
var url = require('url');

exports.npm = {
  domain: 'https://skimdb.npmjs.com',

  keyword: function (keyword) {
    return url.resolve(
      this.domain,
      util.format('/registry/_design/app/_view/byKeyword?startkey=[%22%s%22]&endkey=[%22%s%22,{}]&group_level=3', keyword, keyword)
    );
  },

  package: function (name) {
    return url.resolve(this.domain, '/registry/' + name);
  }
};
