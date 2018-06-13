'use strict';

var MODULE_NAME = 'linagora.esn.dav.import';
var MODULE_DIR_NAME = '/linagora.esn.dav.import';

angular.module(MODULE_NAME)

  .component('davImportSubheaderButton', {
    templateUrl: MODULE_DIR_NAME + '/app/subheader/dav-import-subheader-button.html',
    bindings: {
      davImportDisabled: '<?',
      davImportClick: '&?',
      davImportIconClass: '@?',
      davImportIconText: '@?',
      davImportIconPosition: '@?'
    },
    controllerAs: 'ctrl'
  });
