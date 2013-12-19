module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    jshint: {
      options: grunt.file.readJSON('.jshintrc'),
      gruntfile: 'Gruntfile.js',
      bin: [ 'cli.js', 'yoyo.js' ],
      test: {
        options: {
          globals: {
            describe: true,
            it: true,
            beforeEach: true,
            afterEach: true,
            before: true,
            after: true
          }
        },
        src: 'test/**/*.js'
      }
    },
    watch: {
      files: [
        'Gruntfile.js',
        '<%= jshint.test.src %>',
        '<%= jshint.bin.src %>'

      ],
      tasks: [
        'jshint',
        'mochaTest'
      ]
    },
    mochaTest: {
      test: {
        options: {
          slow: 1500,
          timeout: 50000,
          reporter: 'spec',
          globals: [
            'events',
            'AssertionError',
            'TAP_Global_Harness'
          ]
        },
        src: ['test/**/*.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('default', ['jshint', 'mochaTest']);
};
