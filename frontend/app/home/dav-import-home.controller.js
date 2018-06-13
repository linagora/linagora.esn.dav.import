(function() {
  'use strict';

  var MODULE_NAME = 'linagora.esn.dav.import';

  angular.module(MODULE_NAME)
         .controller('davImportHomeController', davImportHomeController);

   function davImportHomeController() {
     this.message = 'Seed home!';
    }
})();
