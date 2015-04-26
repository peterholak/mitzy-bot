var gulp = require('gulp');
var shell = require('gulp-shell');
var merge_stream = require('merge-stream');
var tsc = require('gulp-tsc');

gulp.task('default', [ 'build', 'test' ]);

gulp.task('build', function() {
    var sources = gulp
        .src([ './run-mitzy.ts', './src/**/*.ts' ])
        .pipe(tsc())
        .pipe(gulp.dest('./bin'));

    var tests = gulp
        .src([ './tests/**/*.ts' ])
        .pipe(tsc())
        .pipe(gulp.dest('./bin/tests'));

    return merge_stream(sources, tests);
});

gulp.task('test', ['build'], shell.task(
    [ 'node bin/tests/tests/run-tests.js' ]
));
