(function() {
  'use strict';

  var MODULE_NAME = 'linagora.esn.dav.import';

  angular.module(MODULE_NAME)
         .directive('davImportApplicationMenu', davImportApplicationMenu);

  function davImportApplicationMenu(applicationMenuTemplateBuilder) {
    var directive = {
      restrict: 'E',
      template: applicationMenuTemplateBuilder('/#/example', 'mdi-emoticon-happy', 'Seed'),
      replace: true
    };

    return directive;
  }
})();
