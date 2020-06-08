'use strict';

const AwesomeModule = require('awesome-module');
const Dependency = AwesomeModule.AwesomeModuleDependency;
const glob = require('glob-all');
const FRONTEND_JS_PATH = __dirname + '/frontend/app/';
const FRONTEND_JS_PATH_BUILD = __dirname + '/dist/';
const AWESOME_MODULE_NAME = 'linagora.esn.dav.import';

const awesomeModule = new AwesomeModule(AWESOME_MODULE_NAME, {
  dependencies: [
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.logger', 'logger'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.wrapper', 'webserver-wrapper'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.db', 'db'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.webserver.middleware.authorization', 'authorizationMW'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.i18n', 'i18n'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.filestore', 'filestore'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.user', 'user'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.jobqueue', 'jobqueue'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.email', 'email'),
    new Dependency(Dependency.TYPE_NAME, 'linagora.esn.core.helpers', 'helpers')
  ],

  states: {
    lib: function(dependencies, callback) {
      const moduleLib = require('./backend/lib')(dependencies);
      const module = require('./backend/webserver/api')(dependencies, moduleLib);

      const lib = {
        api: {
          module: module
        },
        lib: moduleLib
      };

      return callback(null, lib);
    },

    deploy: function(dependencies, callback) {
      // Register the webapp
      const app = require('./backend/webserver/application')(dependencies, this);

      // Register every exposed endpoints
      app.use('/api', this.api.module);

      const webserverWrapper = dependencies('webserver-wrapper');

      // Register every exposed frontend scripts
      let frontendJsFilesFullPath, frontendJsFilesUri;

      if (process.env.NODE_ENV !== 'production') {
        frontendJsFilesFullPath = glob.sync([
          FRONTEND_JS_PATH + '**/*.module.js',
          FRONTEND_JS_PATH + '**/!(*spec).js'
        ]);

        frontendJsFilesUri = frontendJsFilesFullPath.map(filepath => filepath.replace(FRONTEND_JS_PATH, ''));
      } else {
        frontendJsFilesFullPath = glob.sync([
          FRONTEND_JS_PATH_BUILD + '*.js'
        ]);

        frontendJsFilesUri = frontendJsFilesFullPath.map(filepath => filepath.replace(FRONTEND_JS_PATH_BUILD, ''));
      }

      webserverWrapper.injectAngularAppModules(AWESOME_MODULE_NAME, frontendJsFilesUri, AWESOME_MODULE_NAME, ['esn'], {
        localJsFiles: frontendJsFilesFullPath
      });

      webserverWrapper.addApp(AWESOME_MODULE_NAME, app);

      return callback();
    },

    start: function(dependencies, callback) {
      this.lib.init();
      callback();
    }
  }
});

/**
 * The main AwesomeModule describing the application.
 * @type {AwesomeModule}
 */
module.exports = awesomeModule;
