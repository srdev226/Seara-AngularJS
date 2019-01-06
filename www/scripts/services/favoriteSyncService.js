angular.module('searaClientApp')
  .factory('FavoriteSyncService', function($q, GlobalService, AuthService, localStorageService, LocalPathService, LocalFavoritesService, FileSyncService){

  var localContentPath = LocalPathService.localContentPath;
  var localDataPath = LocalPathService.localDataPath;

  var ensureSyncBeforeUpdate = function(){
    var deferred = $q.defer();

    if(window.useLocalStorage){
      FileSyncService.compareBothVersion().then(
        function(needSync){
          if(needSync){
            FileSyncService.syncPresentationsAndFavorites().then(
              function(data){
                deferred.resolve('sync completed');
              },
              function(){
                deferred.resolve('sync failed');
              }
            );
          }
          else{
            deferred.resolve('local contents are already up to date');
          }
        },
        function(){
          deferred.resolve('cannot get version');
        }
      );
    }
    else{
      deferred.resolve('offline mode not available');
    }

    return deferred.promise;
  }

  var addFolder = function(addFolderName, path){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var addFolderParams = {
      'name': addFolderName,
      'view_type': 'default',
      'asset_order_by': 'name'
    };

    ensureSyncBeforeUpdate().then(function(){

      var duplicatedNameMessage = 'Folder with the same name exists';
      var invalidNameMessage = 'Folder name can only contain alphabetical characters, numbers, and space';

      GlobalService.proxyRequest(
        'folders/?path='+path+'&auth_token='+AuthService.authToken,
        'POST',
        addFolderParams
      )

      .success(function(data, status){
        if(data.error_type=='duplicated_name'){
          serverDeferred.reject(duplicatedNameMessage);
          return;
        }
        else if(data.error_type=='invalid_name'){
          serverDeferred.reject(invalidNameMessage);
          return;
        }
        console.log('Add favorites folder done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(data, status){
        console.log('Add favorites folder failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){

          if(data===null){
            if(window.useLocalStorage){
              var result = LocalFavoritesService.action_folder_create(addFolderParams, path);
              if(result.success){
                console.log('Add favorites folder done (local)');
                localDeferred.resolve(result);
              }
              else{
                if(result.error_type=='duplicated_name'){
                  localDeferred.reject(duplicatedNameMessage);
                }
                else if(result.error_type=='invalid_name'){
                  localDeferred.reject(invalidNameMessage);
                }
                else {
                  localDeferred.reject('Add favorites folder failed');
                }
                console.log('Add favorites folder failed (local)')
              }
            }
            else{
              localDeferred.reject('Add favorites folder failed');
            }
          }
          else {
            if(window.useLocalStorage){
              console.log('Reload favorites folder and save to local');
            }
            localDeferred.resolve(data);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });

    return localDeferred.promise;
  }

  var browse = function(){

  }

  var editFolder = function(editFolderName, folderId){ // only rename folder
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var editFolderParams = {
      'name': editFolderName
    };

    ensureSyncBeforeUpdate().then(function(){

      var duplicatedNameMessage = 'Folder with the same name exists';
      var invalidNameMessage = 'Folder name can only contain alphabetical characters, numbers, and space';


      GlobalService.proxyRequest(
        'folders/'+folderId+'?auth_token='+AuthService.authToken,
        'PUT',
        editFolderParams
      )
      .success(function(data){
        if(data.error_type=='duplicated_name'){
          serverDeferred.reject(duplicatedNameMessage);
          return;
        }
        if(data.error_type=='invalid_name'){
          serverDeferred.reject(invalid_name);
          return;
        }
        console.log('Edit favorites folder done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Edit favorites folder failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

     serverDeferred.promise.then(
        function(data){

          if(data===null){
            if(window.useLocalStorage){
              var result = LocalFavoritesService.action_folder_update(editFolderParams, folderId);
              if(result.success){
                console.log('Edit favorites folder done (local)');
                localDeferred.resolve(result);
              }
              else{
                if(result.error_type=='duplicated_name'){
                  localDeferred.reject(duplicatedNameMessage);
                }
                else if(result.error_type=='invalid_name'){
                  localDeferred.reject(invalidNameMessage);
                }
                else {
                  localDeferred.reject('Edit favorites folder failed');
                }
                console.log('Edit favorites folder failed (local)')
              }
            }
            else{
              localDeferred.reject('Edit favorites folder failed');
            }
          }
          else {
            if(window.useLocalStorage){
              console.log('Reload favorites folder and save to local');
            }
            localDeferred.resolve(data);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });
    return localDeferred.promise;
  }


  var deleteFolder = function(folderId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    ensureSyncBeforeUpdate().then(function(){
      GlobalService.proxyRequest(
        'folders/'+folderId+'?auth_token='+AuthService.authToken,
        'DELETE'
      )
      .success(function(data){
        if(data.error_type){
          serverDeferred.reject('Cannot delete folder. Please try again.');
          return;
        }
        console.log('Delete favorites folder done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(data, status){
        console.log('Delete favorites folder failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          if(data===null){
            if(window.useLocalStorage){
              var result = LocalFavoritesService.action_folder_destroy(folderId);
              if(result.success){
                console.log('Delete favorites folder done (local)');
                localDeferred.resolve(result);
              }
              else{
                localDeferred.reject('Cannot delete folder. Please try again.');
                console.log('Delete favorites folder failed (local)')
              }
            }
            else{
              localDeferred.reject('Cannot delete folder. Please try again.');
            }
          }
          else {
            if(window.useLocalStorage){
              console.log('Reload favorites folder and save to local');
            }
            localDeferred.resolve(data);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );

    });

    return localDeferred.promise;
  }

  var editAsset = function(editAssetName, assetId){ // only rename asset
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var editAssetParams = {
      name: editAssetName
    };

    ensureSyncBeforeUpdate().then(function(){
      var duplicatedNameMessage = 'File with the same name exists';
      var invalidNameMessage = 'File name can only contain alphabetical characters, numbers, and space';

      GlobalService.proxyRequest(
        'assets/'+assetId+'?auth_token='+AuthService.authToken,
        'PUT',
        editAssetParams
      )
      .success(function(data){
        if(data.error_type=='duplicated_name'){
          serverDeferred.reject(duplicatedNameMessage);
          return;
        }
        else if(data.error_type=='invalid_name'){
          serverDeferred.reject(invalidNameMessage);
          return;
        }
        console.log('Edit favorites asset done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Edit favorites asset failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          if(data===null){
            if(window.useLocalStorage){
              var result = LocalFavoritesService.action_asset_update(editAssetParams, assetId);
              if(result.success){
                console.log('Edit favorites asset done (local)');
                localDeferred.resolve(result);
              }
              else{
                if(result.error_type=='duplicated_name'){
                  localDeferred.reject(duplicatedNameMessage);
                }
                else if(result.error_type=='invalid_name'){
                  localDeferred.reject(invalidNameMessage);
                }
                else {
                  localDeferred.reject('Edit favorites failed');
                }
                console.log('Edit favorites asset failed (local)')
              }
            }
            else{
              localDeferred.reject('Edit favorites failed');
            }
          }
          else {
            if(window.useLocalStorage){
              console.log('Reload favorites folder and save to local');
            }
            localDeferred.resolve(data);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );

    });

    return localDeferred.promise;
  }

  var moveAsset = function(path, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var moveAssetParams = {
      'path': path
    };

    ensureSyncBeforeUpdate().then(function(){
      var duplicatedNameMessage = 'File with the same name exists';
      var folderNotExistsMessage = 'Folder is not exists';
      var permissionDeniedMessage = 'Unauthorized action';

      GlobalService.proxyRequest(
        'assets/'+assetId+'?path='+path+'&auth_token='+AuthService.authToken,
        'PUT'
      )
      .success(function(data){
        console.log(data);
        if(data.error_type=='folder_not_exists'){
          serverDeferred.reject(folderNotExistsMessage);
          return;
        }
        if(data.error_type=='duplicated_name'){
          serverDeferred.reject(duplicatedNameMessage);
          return;
        }
        else if(data.error_type=='permission_denied'){
          serverDeferred.reject(permissionDeniedMessage);
          return;
        }
        else if(data.error_type){
          serverDeferred.reject('Cannot move file. Please try again.');
          return;
        }
        console.log('Move favorites asset done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(data, status){
        console.log('Move favorites asset failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          if(data===null){
            if(window.useLocalStorage){
              var result = LocalFavoritesService.action_asset_update(moveAssetParams, assetId);
              if(result.success){
                console.log('Move favorites asset done (local)');
                localDeferred.resolve(result);
              }
              else{
                if(result.error_type=='folder_not_exists'){
                  localDeferred.reject(folderNotExistsMessage);
                }
                if(result.error_type=='duplicated_name'){
                  localDeferred.reject(duplicatedNameMessage);
                }
                else if(result.error_type=='permission_denied'){
                  localDeferred.reject(permissionDeniedMessage);
                }
                else if(result.error_type){
                  localDeferred.reject('Cannot move file. Please try again.');
                }
                else{
                  localDeferred.reject('Move favorites failed');
                }
                console.log('Move favorites asset failed (local)');
              }
            }
            else{
              localDeferred.reject('Move favorites failed');
            }
          }
          else{
            if(window.useLocalStorage){
              console.log('Reload favorites folder and save to local');
            }
          }
          localDeferred.resolve(data);
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });

    return localDeferred.promise;
  }

  return {
    addFolder: addFolder,
    browse: browse,
    editFolder: editFolder,
    deleteFolder: deleteFolder,
    editAsset: editAsset,
    moveAsset: moveAsset
  };
});