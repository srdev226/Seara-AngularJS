'use strict';

angular.module('searaClientApp')
  .controller('FavoritesIndexCtrl',function ($modal, $q, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope,
    $upload,$scope, $routeParams, $location, $http, localStorageService, FavoriteSyncService, FileSyncService) {

    folderCtrl.call(this, $modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope,
    $upload,$scope, $routeParams, $location, $http);

    folderBrowserDialog.call(this, $scope, AuthService, FolderService, GlobalService);

    $scope.inFavorites = true;
    $scope.showAddFolder = true;
    $scope.showAddContent = false;
    $rootScope.titleName = 'Favorites';
    $scope.prefixPath = '/favorites/index';

    $scope.searchInFolder = 'favorites';


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

    var browseOffline = function(){

      console.log('favorites offline mode');

      if(path=='/root'){
        var localFolderData = localStorageService.get(userId+'_localFavoritesFolder');
        for(var ii=0; ii<localFolderData.folders.length; ii++){
          if(localFolderData.folders[ii].favorite_root){
            $location.path('/favorites/index'+localFolderData.folders[ii].path);
            return;
          }
        }
        GlobalService.showSimpleDialog('Favorites offline failed');
        return;
      }

      var localFolderData = localStorageService.get(userId+'_localFavoritesFolder');
      var currentFolder = objectsFindByKey(localFolderData.folders, 'path', path);
      currentFolder = objectsFindByKey(currentFolder, 'deleted', undefined);

      if(currentFolder.length!=1){
        GlobalService.showSimpleDialog('Favorites offline failed');
        return;
      }
      currentFolder = currentFolder[0];

      var parentFolder = null;
      if(!currentFolder.favorite_root){
        parentFolder = objectsFindByKey(localFolderData.folders, 'id', currentFolder.parent_id);
        parentFolder = parentFolder[0];
      }

      var folders = objectsFindByKey(localFolderData.folders, 'parent_id', currentFolder.id);
      var assets = objectsFindByKey(localFolderData.assets, 'folder_id', currentFolder.id);

      for(var ii=0; ii<folders.length; ii++){
        var folder = folders[ii];
        if(folder['deleted']){
          folders.splice(ii, 1);
          ii--;
        }
      }

      var favorites = localFolderData.favorites;

      var currentFolderData = {
        "currentFolder": currentFolder,
        "parentFolder": parentFolder,
        "folders": folders,
        "assets": assets,
        "favorites": favorites
      };


      FolderService.setFolder(currentFolderData, $scope, 'favorites');
    }

    $scope.browse = function(){
      if($rootScope.isOnline){
        console.log('favorites online mode');
        if (path=='/root'){
          GlobalService.showLoadingMask();
          GlobalService.proxyRequest(
            'favorites?auth_token='+AuthService.authToken,
            'GET'
          )
          .success(function (data, status){
            GlobalService.hideLoadingMask();
            $location.path('/favorites/index'+data.path);
          })
          .error(function(data, status){
            GlobalService.hideLoadingMask();
            if(status==401) return;
            if(window.useLocalStorage){
              browseOffline();
            }
            else{
              GlobalService.showSimpleDialog('Cannot connect to the server');
            }
          });
        }
        else {
          if(window.useLocalStorage){
            FileSyncService.syncFavorites().then(
              function(){
                browseOffline();
              },
              function(){
                browseOffline();
              }
            );
          }
          else{
            FolderService.browse($scope, path, token, userId, groupId, 'favorites');
          }
        }
      }
      else{
        if(window.useLocalStorage){
          browseOffline();
        }
        else{
          GlobalService.showSimpleDialog('No connection. Cannot view folder.');
        }

      }
    }

    var titlebarRightButtons = [
      { functionToCall: "showSearchFolderDialog", args: '()', iconClass: 'search-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);


    function objectsFindByKey(array, key, value) {
      var result = [];
      for (var i = 0; i < array.length; i++) {
        if(array[i][key] === value) {
          result.push(array[i]);
        }
      }
      return result;
    }

    $scope.browseByType = function (scope, path, type, token, userId, groupId, menu) {
      var deferred = $q.defer();
      GlobalService.showLoadingMask();
      var waitForFolderData = $q.defer();
      GlobalService.proxyRequest(
        'folders/?path='+path+'&type='+type+'&auth_token='+AuthService.authToken,
        'GET'
      )
      .success(function (data, status){
        waitForFolderData.resolve(data);
      })
      .error(function (data, status){
        if(status==401){
          waitForFolderData.reject('Unauthorized');
          return;
        }

        if(window.useLocalStorage){
          var localFolderData = localStorageService.get(userId+'_localFavoritesFolder');
          var currentFolder = objectsFindByKey(localFolderData.folders, 'path', path);

          if(currentFolder.length!=1){
            GlobalService.showSimpleDialog('Cannot browse folder', 'Please check connection and try again');
            return;
          }
          currentFolder = currentFolder[0];

          var parentFolder = null;
          if(!currentFolder.favorite_root){
            parentFolder = objectsFindByKey(localFolderData.folders, 'id', currentFolder.parent_id);
            parentFolder = parentFolder[0];
          }

          var folders = objectsFindByKey(localFolderData.folders, 'parent_id', currentFolder.id);

          for(var ii=0; ii<folders.length; ii++){
            var folder = folders[ii];
            if(folder['deleted']){
              folders.splice(ii, 1);
              ii--;
            }
          }

          var favorites = localFolderData.favorites;

          var currentFolderData = {
            "currentFolder": currentFolder,
            "parentFolder": parentFolder,
            "folders": folders,
            "assets": [],
            "favorites": favorites
          };

          waitForFolderData.resolve(currentFolderData);
        }
        else{
          waitForFolderData.reject('Cannot connect to server');
        }
      });

      waitForFolderData.promise.then(
        function(data){
          data.folders = data.folders.sort(function(folderA, folderB){
            if (folderA.name.toLowerCase()>folderB.name.toLowerCase()) return 1;
            else if (folderA.name.toLowerCase()<folderB.name.toLowerCase()) return -1;
            else return 0;
          });
          if(menu=='folderBrowserDialog'){
            GlobalService.hideLoadingMask();

            scope.folderBrowserDialogFolderData=data;

            // var str = '';
            // for(var i=0; i<50; i++){
            //   str+=',{}';
            // }
            // scope.folderBrowserDialogFolderData.folders = JSON.parse("["+str.substring(1)+"]");

            //remove /root/ from shown path
            scope.dialogTitleName = data.currentFolder.name;
            scope.selectedAssetPath = data.currentFolder.path;
            // scope.dialogTitleName = data.currentFolder.name;
            deferred.resolve();
          }
          else{
            // not used as favorite index will use browseByType for moving asset only
          }
        },

        function(message){
          GlobalService.hideLoadingMask();
          deferred.reject(message);
        }
      );
      return deferred.promise;
    }

    $scope.addFolder = function(){
      GlobalService.showLoadingMask();
      FavoriteSyncService.addFolder($scope.addFolderName, path).then(
        function(data){
          GlobalService.hideLoadingMask();
          $location.path($scope.prefixPath+data.folder.path);
        },
        function(message){
          GlobalService.hideLoadingMask();
          if(message) GlobalService.showSimpleDialog(message);
        }
      );
    }

    $scope.editFolder = function(){
      GlobalService.showLoadingMask();
      FavoriteSyncService.editFolder($scope.selectedFolderName, $scope.selectedFolderId).then(
        function(data){
          GlobalService.hideLoadingMask();
          $('#editFolderModal').modal('hide');
          $scope.browse();
        },
        function(message){
          GlobalService.hideLoadingMask();
          if(message) GlobalService.showSimpleDialog(message);
        }
      );
    }

    $scope.editAsset = function(){
      GlobalService.showLoadingMask();
      FavoriteSyncService.editAsset($scope.selectedAssetName, $scope.selectedAssetId).then(
        function(data){
          GlobalService.hideLoadingMask();
          $('#editContentModal').modal('hide');
          $scope.folderData.assets[$scope.selectedAssetIndex] = data.asset;
        },
        function(message){
          GlobalService.hideLoadingMask();
          if(message) GlobalService.showSimpleDialog(message);
        }
      );
    }

    $scope.moveAsset = function(){
      GlobalService.showLoadingMask();
      FavoriteSyncService.moveAsset($scope.selectedAssetPath, $scope.selectedAssetId).then(
        function(data){
          GlobalService.hideLoadingMask();
          $('#folderBrowserModal').modal('hide');
          $scope.browse();
        },
        function(message){
          GlobalService.hideLoadingMask();
          if(message) GlobalService.showSimpleDialog(message);
        }
      );
    }

    $scope.deleteFolder = function(){
      GlobalService.showLoadingMask();
      FavoriteSyncService.deleteFolder($scope.selectedFolderId).then(
        function(data){
          GlobalService.hideLoadingMask();
          $('#confirmDeleteFolderModal').modal('hide');
          $scope.browse();
        },
        function(message){
          GlobalService.hideLoadingMask();
          $('#confirmDeleteFolderModal').modal('hide');
          if(message) GlobalService.showSimpleDialog(message);
        }
      );
    }



});
