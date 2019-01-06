function assetBrowserDialog ($scope, $rootScope, $q, type, AuthService, FolderService, FileSyncService, GlobalService, localStorageService){

  var token = AuthService.authToken;
  var userId = AuthService.currentUser.user_id;
  var groupId = AuthService.currentUser.group_id;

  $scope.showAssetBrowserDialog = function(){
    // $scope.browse('/root/Cloud');
    $scope.tempMultipleAssets = JSON.parse(JSON.stringify($scope.selectedAssets));
    $scope.browse($scope.currentDialogPath || null);

    $('#assetBrowserModal').modal('show');
  }

  $scope.browse = function(path){
    if(!path){ // for selecting between cloud or favorites
      $scope.selectCloudOrFavorites = true;
      $scope.currentDialogPath = null;
      $scope.folderData  = { folders: [
        {name: 'Seara Cloud', path: '@cloud_root'},
        {name: 'Favorites',  path: '@favorites_root'}
      ]};
      $scope.dialogTitleName = 'Choose from Seara Cloud or Favorites';
      $scope.currentFolderName = '';
      $scope.folderType = '';
    }
    else{ // path exists
      var pathDeferred = $q.defer();
      if(path==='@favorites_root'){
        var favoritePathDeferred = GlobalService.proxyRequest(
          'favorites?auth_token='+token,
          'GET'
        )
        .success(function(data){
          pathDeferred.resolve(data.path);
        })
        .error(function(){
          var localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
          for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
            if(localFavoritesFolder.folders[ii].favorite_root){
              pathDeferred.resolve(localFavoritesFolder.folders[ii].path);
              break;
            }
          }
        });
      }
      else if(path==='@cloud_root'){
        var cloudPathDeferred = GlobalService.proxyRequest(
          'cloud?auth_token='+token,
          'GET'
        )
        .success(function(data){
          pathDeferred.resolve(data.path);
        })
        .error(function(){
          GlobalService.showSimpleDialog('Cannot browse folder', 'Please check connection and try again');
          pathDeferred.reject();
          $scope.browse(null);
        });
      }
      else pathDeferred.resolve(path);

      pathDeferred.promise.then(function(path){


        FolderService.browseByType($scope, path, type, token, userId, groupId, 'assetBrowserDialog').then(
          function(){
            $scope.markSelectedAssets();
            $scope.selectCloudOrFavorites = false;
            if(window.useLocalStorage){
              FileSyncService.syncFavorites();
            }
          },
          // error getting data from server
          function(){

            var localFolderData = localStorageService.get(userId+'_localFavoritesFolder');
            var currentFolder = objectsFindByKey(localFolderData.folders, 'path', path);

            if(currentFolder.length!=1){
              GlobalService.showSimpleDialog('Cannot browse folder', 'Please check connection and try again');
              $scope.browse(null);
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

            assets = objectsFindByKey(assets, 'content_type', 'image');

            var favorites = localFolderData.favorites;

            var currentFolderData = {
              "currentFolder": currentFolder,
              "parentFolder": parentFolder,
              "folders": folders,
              "assets": assets,
              "favorites": favorites
            };

            $scope.currentDialogPath = currentFolder.path;

            FolderService.setFolder(currentFolderData, $scope, 'assetBrowserDialog');
            $scope.selectCloudOrFavorites = false;

            $scope.markSelectedAssets();
          }

        );
      });
    }
  }

  function objectsFindByKey(array, key, value) {
    var result = [];
    for (var i = 0; i < array.length; i++) {
      if(array[i][key] === value) {
        result.push(array[i]);
      }
    }
    return result;
  }

  $scope.searchFolder = function(){
    var searchDeferred = $q.defer();

    GlobalService.showLoadingMask();
    var currentPath = $scope.folderData.currentFolder.path;

    GlobalService.proxyRequest(
      'folders/search?searchIn='+$scope.folderType+'&q='+encodeURIComponent($scope.searchText)+'&auth_token='+token,
      'GET'
    )
    .success(function (data, status){
      $scope.folderData = data;

      searchDeferred.resolve();
    })
    .error(function(){
      if($scope.folderType==='favorites' && window.useLocalStorage){
        var localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
        var folderData = {};
        var currentFolder = $scope.folderData.currentFolder;
        var assets = [];
        localFavoritesFolder.assets.forEach(function(asset){
          if(asset.name.match($scope.searchText)){
            assets.push(asset);
          }
        });
        folderData.currentFolder = currentFolder;
        folderData.assets = assets;
        folderData.folders = [];
        folderData.favorites = localFavoritesFolder.favorites;

        $scope.folderData = folderData;

        searchDeferred.resolve();
      }
      else{
        GlobalService.hideLoadingMask();
        searchDeferred.reject();
      }
    });

    searchDeferred.promise.then(
      function(){
        $scope.folderData.assets = $scope.folderData.assets.sort(function(assetA, assetB){
          if (assetA.name.toLowerCase()>assetB.name.toLowerCase()) return 1;
          else if (assetA.name.toLowerCase()<assetB.name.toLowerCase()) return -1;
          else return 0;
        });

        var idx = 0;
        $scope.thumbnailSource = [];
        $scope.folderData.assets.forEach(function(asset){
          asset.thumbnailSource = $scope.getThumbnailSource(asset.id);
        });
        $scope.markSelectedAssets();

        $scope.dialogTitleName = $scope.folderData.currentFolder.name;
        $scope.currentFolderName = 'Search';
        $scope.backPath = $scope.folderData.currentFolder.path;

        GlobalService.hideLoadingMask();
      },
      function(){
        console.log('search failed');
      }
    );
  }

  $scope.getThumbnailSource = function(assetId){
    return FolderService.getThumbnailSource(assetId);
  }

  // use for getting the other asset id of same content in both cloud and favorites
  // then use that asset id to mark selected asset and to remove it
  var getPairIdFromFavorites = function(assetId){
    var pairId = null;
    for(var kk=0; kk<$scope.folderData.favorites.length; kk++){
      if($scope.folderData.favorites[kk].favorite_asset_id==assetId){
        pairId = $scope.folderData.favorites[kk].source_asset_id;
        break;
      }
      else if($scope.folderData.favorites[kk].source_asset_id==assetId){
        pairId = $scope.folderData.favorites[kk].favorite_asset_id;
        break;
      }
    }
    return pairId;
  }

  $scope.selectAsset = function(asset){
    var pairId = getPairIdFromFavorites(asset.id);

    if(asset.selectedOrder){
      for(var ii=0; ii<$scope.tempMultipleAssets.length; ii++){
        //show selection on both asset and pair asset(favorite or source)
        if($scope.tempMultipleAssets[ii].id==asset.id ||
          $scope.tempMultipleAssets[ii].id==pairId){

          $scope.tempMultipleAssets.splice(ii,1);
          break;
        }
      }
    }
    else{
      if($scope.tempMultipleAssets.length>=($scope.maxSlide || 20)) return;

      $scope.tempMultipleAssets.push({'id': asset.id, 'name': asset.name});
    }
    $scope.markSelectedAssets();
  }

  $scope.markSelectedAssets = function(){
    for(var jj=0; jj<$scope.folderData.assets.length; jj++){
      var pairId = getPairIdFromFavorites($scope.folderData.assets[jj].id);

      var selectedOrder = null;
      for(var ii=0; ii<$scope.tempMultipleAssets.length; ii++){
        //check for both asset and pair asset(favorite or source)
        if($scope.folderData.assets[jj].id==$scope.tempMultipleAssets[ii].id ||
          pairId==$scope.tempMultipleAssets[ii].id){
          selectedOrder = ii+1;
          break;
        }
      }
      $scope.folderData.assets[jj].selectedOrder = selectedOrder;
    }
  }

  //limit to 20 assets at the same time ($scope.maxSlide)
  $scope.confirmAssets = function(){
    $scope.selectedAssets = JSON.parse(JSON.stringify($scope.tempMultipleAssets));

    $('#assetBrowserModal').modal('hide');
  }
}
