(function() {
  'use strict';

  var MODULE_NAME = 'linagora.esn.dav.import';
  var MODULE_DIR_NAME = '/linagora.esn.dav.import';

  angular.module(MODULE_NAME)
         .component('davImportSubheader', davImportSubheader());

  function davImportSubheader() {
    var component = {
      templateUrl: MODULE_DIR_NAME + '/app/home/dav-import-subheader.html'
    };

    return component;
  }

})();
