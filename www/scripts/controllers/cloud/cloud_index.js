
'use strict';

angular.module('searaClientApp')
  .controller('CloudIndexCtrl',function ($modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope, 
    $upload,$scope, $routeParams, $location, $http, ConnectionService) {
    
    folderCtrl.call(this, $modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope, 
    $upload,$scope, $routeParams, $location, $http, 'cloud');

    folderBrowserDialog.call(this, $scope, AuthService, FolderService, GlobalService);

    $scope.showAddFolder = $scope.showAddContent = true;

    $scope.prefixPath = '/cloud/index';

    $scope.searchInFolder = 'cloud';

    var notifyOfflinePromise = ConnectionService.notifyOffline();

    var titlebarRightButtons = [
      { functionToCall: "showSearchFolderDialog", args: '()', iconClass: 'search-button', text: null }
    ];

    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});
	
	




