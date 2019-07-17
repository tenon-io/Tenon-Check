(function () {
    "use strict";

    var Config = {
        babel: {
            options: {
                sourceMap: true,
                presets: ['@babel/env']
            },
            dist: {
                files: {
                    '.build/check.js': 'src/check.js',
                    '.build/background.js' : 'src/background.js',
                    '.build/options.js' : 'src/options.js'
                }
            }
        },
        eslint: {
            dist: ['src/background.js', 'src/options.js', 'src/check.js'],
            options: {
                configFile: '.eslintrc.json'
            },
        },
        uglify: {
            dist: {
                files: {
                    'dist/check.js' : '.build/check.js',
                    'dist/background.js' : '.build/background.js',
                    'dist/options.js' : '.build/options.js'
                }
            }
        },
        copy: {
            dist: {
                files: [
                    { expand: true, src: 'src/options.html', dest: 'dist/', flatten: true },
                    { expand: true, src: 'src/options.css', dest: 'dist/', flatten: true },
                    { expand: true, src: 'manifest.json', dest: 'dist/' },
                    { expand: true, src: 'assets/*', dest: 'dist/' }
                ],
            }
        },
        clean: ['.build'],
        run: {
            test: {
                cmd: 'npm',
                args: [
                    'test'
                ]
            }
        },
    };

    module.exports = function (grunt) {
        require('load-grunt-tasks')(grunt);
        grunt.initConfig(Config);
        grunt.registerTask('default', ['eslint', 'babel', 'run:test', 'uglify', 'copy', 'clean']);
    };
})();
