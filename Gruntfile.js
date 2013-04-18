var util = require('util');
var path = require('path');

module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    lint: {
      options: {
        options: '<json:.jshintrc>',
        global: {
          process: true
        }
      },
      grunt: [
        'Gruntfile.js',
        //'tasks/*.js',
      ],
      lib: [
        //'lib/{plugins,utils}/*.js',
        //'lib/generators/*.js'
      ],
      test: [
        //'test/**/*.js'
      ]
    },
    watch: {
      files: '<config:lint>',
      tasks: 'lint'
    }
  });

  // Disable lint for now until we upgrade to latest grunt with latest jshint
  grunt.registerTask('default', 'lint');
};
