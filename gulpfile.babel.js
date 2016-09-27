import gulp from 'gulp';
import del from 'del';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync_module from 'browser-sync';

let browserSync = browserSync_module.create();

const $ = gulpLoadPlugins({
    pattern: ['gulp-*', 'gulp.*']
});

var paths = {
    styles: 'app/styles/**/*.scss',
    templates: 'app/templates/',
    pages: 'app/templates/pages/**/*.+(html|nunjucks)',
    scripts: 'app/scripts/**/*.js',
    vendor: [
        './bower_components/jquery/dist/jquery.js',
        './bower_components/foundation-sites/dist/foundation.js'
    ],
    images: [
        'app/images/**/*.svg',
        'app/images/**/*.gif',
        'app/images/**/*.png',
        'app/images/**/*.jpg'
    ]
};


// =======================================================================
// Styles: compiles sass, autoprefixes, and combines media queries
// =======================================================================
gulp.task('styles', () => {
    return gulp.src(paths.styles)
        .pipe($.sass({
            outputStyle: 'expanded',
            precision: 6,
            includePaths: [
                './bower_components/foundation-sites/scss',
                './bower_components/motion-ui/src',
                './bower_components/megatype'
            ]
        })
        .on('error', $.sass.logError))
        .pipe($.postcss([
            require('autoprefixer')({browsers: ['last 3 versions', '> 5%', 'IE >= 9']})
        ]))
        .pipe(gulp.dest('.tmp/styles'))
        .pipe($.size())
        .pipe(browserSync.stream());
});


// =======================================================================
// Lint: checks javascript for errors
// =======================================================================
function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format())
  };
}
const testLintOptions = {
  env: {
    mocha: true
  }
};

gulp.task('lint', lint(paths.scripts));


// =======================================================================
// Scripts: lint & concatenate scripts
// =======================================================================
gulp.task('scripts', ['lint'], () => {
    return gulp.src(paths.scripts)
        .pipe($.concat('main.js'))
        .pipe(gulp.dest('.tmp/scripts'))
        .pipe($.size());
});


// =======================================================================
// Vendor: concatenate external scripts
// =======================================================================
gulp.task('vendor', () => {
    return gulp.src(paths.vendor)
        .pipe($.concat('vendor.js'))
        .pipe(gulp.dest('.tmp/scripts'))
        .pipe($.size());
});


// =======================================================================
// Images: minification
// =======================================================================
gulp.task('images', () => {
    return gulp.src(paths.images)
        .pipe($.if($.if.isFile, $.cache($.imagemin({
            progressive: true,
            interlaced: true,
            // don't remove IDs from SVGs, they are often used
            // as hooks for embedding and styling
            svgoPlugins: [{cleanupIDs: false}]
        }))
        .on('error', function (err) {
            console.log(err);
            this.end();
        })))
        .pipe(gulp.dest('dist/images'))
        .pipe($.size());
});


// =======================================================================
// Process html partials
// =======================================================================
gulp.task('html', () => {
    // Gets .html and .nunjucks files in pages
    return gulp.src(paths.pages)
        // Renders template with nunjucks
        .pipe($.nunjucksRender({
            path: paths.templates
        }))
        .pipe($.prettify({indent_size: 4}))
        // output files in app folder
        .pipe(gulp.dest('.tmp'))
        .pipe($.size());
});


// =======================================================================
// Minify html, css, and js, and move all files to dist
// =======================================================================
gulp.task('minify', () => {
    return gulp.src('.tmp/**/*')
        .pipe($.if('*.css', $.cssnano()))
        .pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.html', $.prettify({indent_size: 4})))
        .pipe(gulp.dest('dist'))
        .pipe($.size());
});


// =======================================================================
// Build task: builds all files and minifies into 'dist'
// =======================================================================
gulp.task('build', ['html', 'images', 'styles', 'vendor', 'scripts'], () => {
    gulp.start('minify');
});


// =======================================================================
// Default build
// =======================================================================
gulp.task('default', ['build'], () => {});
// alias
gulp.task('dist', ['build'], () => {});


// =======================================================================
// Development watch task.  Does not build anything initially
// =======================================================================
gulp.task('watch', (done) => {
    browserSync.init({
        notify: false,
        port: 9000,
        server: {
            baseDir: ['.tmp', 'app'],
            routes: {
                '/bower_components': 'bower_components'
            }
        },
        ghostMode: false
    });

    // store the timeout
    var timeout;

    // watch for changes on built files
    gulp.watch([
        '.tmp/*.html',
        '.tmp/scripts/**/*.js',
        'app/images/**/*'
    ]).on('change', function() {
        // throttle the reload to 500ms
        // TODO: this whole bit is pretty messy and could certainly be improved
        clearTimeout(timeout);

        if (!timeout) {
            // reload the browser
            browserSync.reload();
        }

        timeout = setTimeout(function() {
            // reset the timeout
            timeout = false;
        }, 500);
    });

    // watch the source files, and build relevant files
    gulp.watch(paths.styles, ['styles']);
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch('bower.json', ['vendor']);
    gulp.watch(paths.templates + '/**/*.html', ['html']);
});


// =======================================================================
// Development serve task.  Builds everything initially
// =======================================================================
gulp.task('serve', ['html', 'styles', 'vendor', 'scripts'], () => {
    gulp.start('watch');
});
