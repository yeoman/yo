module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    jshint: {
      options: grunt.file.readJSON('.jshintrc'),
      gruntfile: 'Gruntfile.js',
      bin: [ 'cli.js', 'yoyo.js', 'lib/**/*.js' ],
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
          reporter: 'spec'
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
