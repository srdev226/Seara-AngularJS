'use strict';

angular.module('searaClientApp')
  .controller('PresentationIndexCtrl',function ($modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, localStorageService, $rootScope,
    $upload,$scope, $routeParams, $location, $http, FileSyncService, PresentationSyncService) {

    folderCtrl.call(this, $modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope,
    $upload,$scope, $routeParams, $location, $http);

    $scope.showAddPresentation = true;
    $rootScope.titleName = 'Presentations';
    $scope.prefixPath = '/presentations/index';

		$scope.searchInFolder = 'presentations';

		$scope.searchFolder = function(){
      $('input').blur();
      $scope.searchTextLocal = $scope.folderSearchText;
      $scope.searchText = $scope.folderSearchText;
      $('.search-bar').removeClass('hide');
      $('.folders-browser').height('100%');
      $('.folders-browser').height($('.folders-browser').height()-$('.search-bar').height());
    }

    $scope.clearSearch = function(){
      $scope.searchTextLocal='';
      $scope.folderSearchText = '';
      $('.search-bar').addClass('hide');
      $('.folders-browser').height('100%');
    }

    var token = AuthService.authToken;
    var userId = AuthService.currentUser.user_id;
    var groupId = AuthService.currentUser.group_id;
    var apiUrl = GlobalService.apiUrl;

    $scope.browse = function(){
      if($rootScope.isOnline){
        if (path=='/root'){
          GlobalService.showLoadingMask();
          GlobalService.proxyRequest(
            'presentations?auth_token='+AuthService.authToken,
            'GET'
          )
          .success(function (data, status){
            GlobalService.hideLoadingMask();
            $location.path('/presentations/index'+data.path);
          })
          .error(function(data, status){
            GlobalService.hideLoadingMask();
            if(status==401) return;
            if(window.useLocalStorage){
              console.log('presentations offline mode');
              FolderService.setFolder(localStorageService.get(userId+'_localPresentationsFolder'), $scope);
            }
            else{
              GlobalService.showSimpleDialog('Cannot connect to the server');
            }
          });
        }
        else{
          if(window.useLocalStorage){ // path is not root folder
            console.log('presentations offline mode');
            GlobalService.showLoadingMask();
            FileSyncService.syncFavorites();
            FileSyncService.syncPresentations().then(function(){
              GlobalService.hideLoadingMask();
              FolderService.setFolder(localStorageService.get(userId+'_localPresentationsFolder'), $scope);
            }, function(){
              GlobalService.hideLoadingMask();
              FolderService.setFolder(localStorageService.get(userId+'_localPresentationsFolder'), $scope);
              console.log('failed to sync presentations');
            });
          }
          else{
            console.log('presentations online mode');
            FolderService.browse($scope, path, token, userId, groupId);
          }
        }
      }

      else{
        if(window.useLocalStorage){
          console.log('presentations offline mode');
          FolderService.setFolder(localStorageService.get(userId+'_localPresentationsFolder'), $scope);
        }
        else{
          GlobalService.showSimpleDialog('No connection. Cannot view folder.');
          $location.path('/');
        }
      }
    }

    $scope.addPresentation = function(){ // this function work with local
      GlobalService.showLoadingMask();
      PresentationSyncService.addPresentation($scope.addPresentationName).then(
        function(data){
          $('.modal-backdrop').remove();
          $location.path('presentations/'+data.presentation.asset_id+'/edit');
          GlobalService.hideLoadingMask();
        },
        function(message){
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    $scope.editPresentation = function(){
      GlobalService.showLoadingMask();
      var presentation = {
        'name': $scope.selectedAssetName
      };

      PresentationSyncService.editPresentationAsset(presentation, $scope.selectedAssetId).then(
        function(data){
          $('#editPresentationModal').modal('hide');
          GlobalService.hideLoadingMask();
          $scope.browse($scope.folderData.currentFolder.path);
        },
        function(message){
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    $scope.deleteAsset = function(scope, token){
      GlobalService.showLoadingMask();
      PresentationSyncService.deletePresentation($scope.selectedAssetId).then(
        function(data){
          GlobalService.hideLoadingMask();
          $('#confirmDeleteAssetModal').modal('hide');
          $scope.browse($scope.folderData.currentFolder.path);
        },
        function(message){
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    var titlebarRightButtons = [
      { functionToCall: "showSearchFolderDialog", args: '()', iconClass: 'search-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});
