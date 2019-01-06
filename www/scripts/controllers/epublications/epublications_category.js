'use strict';

angular.module('searaClientApp')
 .controller('EPublicationsCategoryCtrl',function( $routeParams, $scope, $rootScope, $timeout, $q, $location, GlobalService, FolderService, AuthService, $interval) {  
  
      $rootScope.titleName = 'E-Publications';

      $scope.openCategory = function(category) {
        $location.path('epublications/'+category);
      }
});
	
