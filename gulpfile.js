'use strict';
const path = require('path');
const gulp = require('gulp');
const mocha = require('gulp-mocha');
const istanbul = require('gulp-istanbul');
const plumber = require('gulp-plumber');
const coveralls = require('gulp-coveralls');

gulp.task('pre-test', () =>
  gulp.src('lib/**/*.js')
    .pipe(istanbul({includeUntested: true}))
    .pipe(istanbul.hookRequire())
);

gulp.task('test', ['pre-test'], cb => {
  let mochaErr;

  // Will disable cache for completion tests
  process.env.YO_TEST = 1;

  gulp.src('test/**/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', err => {
      mochaErr = err;
    })
    .pipe(istanbul.writeReports())
    .on('end', () => {
      cb(mochaErr);
    });
});

gulp.task('coveralls', ['test'], () => {
  if (!process.env.CI) {
    return;
  }

  return gulp.src(path.join(__dirname, 'coverage/lcov.info'))
    .pipe(coveralls());
});

gulp.task('default', ['test', 'coveralls']);
