'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _flatMap = require('lodash/flatMap');

var _flatMap2 = _interopRequireDefault(_flatMap);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _webpackSources = require('webpack-sources');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _paths = require('./paths');

var _index = require('./utils/index.js');

var _createCompileIfNeeded = require('./createCompileIfNeeded');

var _createCompileIfNeeded2 = _interopRequireDefault(_createCompileIfNeeded);

var _createConfig = require('./createConfig');

var _createConfig2 = _interopRequireDefault(_createConfig);

var _createMemory = require('./createMemory');

var _createMemory2 = _interopRequireDefault(_createMemory);

var _createSettings = require('./createSettings');

var _createSettings2 = _interopRequireDefault(_createSettings);

var _getInstanceIndex = require('./getInstanceIndex');

var _getInstanceIndex2 = _interopRequireDefault(_getInstanceIndex);

var _createHandleStats = require('./createHandleStats');

var _createHandleStats2 = _interopRequireDefault(_createHandleStats);

var _createLogger = require('./createLogger');

var _createLogger2 = _interopRequireDefault(_createLogger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AutoDLLPlugin = function () {
  function AutoDLLPlugin(settings) {
    _classCallCheck(this, AutoDLLPlugin);

    this._originalSettings = settings;
  }

  _createClass(AutoDLLPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var settings = (0, _createSettings2.default)({
        originalSettings: this._originalSettings,
        index: (0, _getInstanceIndex2.default)(compiler.options.plugins, this),
        parentConfig: compiler.options
      });

      var log = (0, _createLogger2.default)(settings.debug);
      var dllConfig = (0, _createConfig2.default)(settings, compiler.options);
      var compileIfNeeded = (0, _createCompileIfNeeded2.default)(log, settings);

      var memory = (0, _createMemory2.default)();
      var handleStats = (0, _createHandleStats2.default)(log, settings.hash, memory);

      if ((0, _isEmpty2.default)(dllConfig.entry)) {
        // there's nothing to do.
        return;
      }

      var context = settings.context,
          inject = settings.inject;


      (0, _index.keys)(dllConfig.entry).map((0, _paths.getManifestPath)(settings.hash)).forEach(function (manifestPath) {
        new _webpack.DllReferencePlugin({
          context: context,
          manifest: manifestPath
        }).apply(compiler);
      });

      compiler.plugin('before-compile', function (params, callback) {
        params.compilationDependencies = params.compilationDependencies.filter(function (path) {
          return !path.startsWith(_paths.cacheDir);
        });

        callback();
      });

      compiler.plugin(['run', 'watch-run'], function (_compiler, callback) {
        compileIfNeeded(function () {
          return (0, _webpack2.default)(dllConfig);
        }).then(function (a) {

          return a;
        }).then(handleStats).then(function (_ref) {
          var source = _ref.source,
              stats = _ref.stats;

          compiler.applyPlugins('autodll-stats-retrieved', stats, source);

          if (source === 'memory') return;
          return memory.sync(settings.hash, stats);
        }).then(function () {
          return callback();
        }).catch(console.error);
      });

      compiler.plugin('emit', function (compilation, callback) {
        var dllAssets = memory.getAssets().reduce(function (assets, _ref2) {
          var filename = _ref2.filename,
              buffer = _ref2.buffer;

          var assetPath = _path2.default.join(settings.path, filename);

          return _extends({}, assets, {
            [assetPath]: new _webpackSources.RawSource(buffer)
          });
        }, {});

        compilation.assets = (0, _index.merge)(compilation.assets, dllAssets);

        callback();
      });

      if (inject) {
        compiler.plugin('compilation', function (compilation) {
          compilation.plugin('html-webpack-plugin-before-html-generation', function (htmlPluginData, callback) {
            var dllEntriesPaths = (0, _flatMap2.default)(memory.getStats().entrypoints, 'assets').map(function (filename) {
              return (0, _paths.getInjectPath)({
                publicPath: settings.publicPath,
                pluginPath: settings.path,
                filename
              });
            });

            htmlPluginData.assets.js = (0, _index.concat)(dllEntriesPaths, htmlPluginData.assets.js);

            callback(null, htmlPluginData);
          });
        });
      }
    }
  }]);

  return AutoDLLPlugin;
}();

exports.default = AutoDLLPlugin;