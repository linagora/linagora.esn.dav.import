(function() {
  'use strict';

  var MODULE_NAME = 'linagora.esn.dav.import';

  angular.module(MODULE_NAME)
    .config(davImportApplicationMenu);

  function davImportApplicationMenu(dynamicDirectiveServiceProvider) {
    var home = new dynamicDirectiveServiceProvider.DynamicDirective(true, 'dav-import-application-menu');

    dynamicDirectiveServiceProvider.addInjection('esn-application-menu', home);
  }
})();
