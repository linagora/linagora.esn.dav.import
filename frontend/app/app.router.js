(function() {
  'use strict';

  var MODULE_NAME = 'linagora.esn.dav.import';
  var MODULE_DIR_NAME = '/linagora.esn.dav.import';

  angular.module(MODULE_NAME)

    .config(function($stateProvider) {
      $stateProvider
        .state('example', {
          url: '/example',
          views: {
            '': {
              templateUrl: MODULE_DIR_NAME + '/app/home/dav-import-home.html'
            },
            'sidebar@example': {
              templateUrl: MODULE_DIR_NAME + '/app/home/dav-import-sidebar.html'
            }
          },
          deepStateRedirect: {
            default: 'example.home',
            fn: function() {
              return { state: 'example.home' };
            }
          }
        })
        .state('example.home', {
          url: '/home',
          controller: 'davImportHomeController',
          controllerAs: 'ctrl',
          views: {
            'main@example': {
              templateUrl: MODULE_DIR_NAME + '/app/home/dav-import-main.html'
            }
          }
        });
    });
})();
