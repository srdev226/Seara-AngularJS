'use strict';

angular.module('searaClientApp')
  .factory('FileSyncService', function(
    $q,
    $timeout,
    $interval,
    localStorageService,
    GlobalService,
    AuthService,
    LocalPathService
  ){

    if(!window.useLocalStorage) return {};

    var showSyncing = GlobalService.showSyncing;
    var hideSyncing = GlobalService.hideSyncing;

    var localContentPath = LocalPathService.localContentPath;

    var lockFavorites = false;
    var lockPresentations = false;
    var lockPresAndFav = false;

    var initLocalDataObject = function(){
      var localContents = localStorageService.get('localContents');
      if(!localContents){
        console.log('create blank localContents');
        localContents = {};
        localStorageService.set('localContents', localContents);
      }

      var localAssetToContent = localStorageService.get('localAssetToContent');
      if(!localAssetToContent){
        console.log('create blank localAssetToContent');
        localAssetToContent = {};
        localStorageService.set('localAssetToContent', localAssetToContent);
      }

      var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
      if(!localAssetToPresentation){
        console.log('create blank localAssetToPresentation');
        localAssetToPresentation = {};
        localStorageService.set('localAssetToPresentation', localAssetToPresentation);
      }

      var localSlideToContent = localStorageService.get('localSlideToContent');
      if(!localSlideToContent){
        console.log('create blank localSlideToContent');
        localSlideToContent = {};
        localStorageService.set('localSlideToContent', localSlideToContent);
      }
    }
    initLocalDataObject();

    var updateFavoritesFolder = function(){
      var deferred = $q.defer();

      console.log('start updateFavoritesFolder');
      showSyncing();

      var localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');

      GlobalService.proxyRequest(
        'sync_favorites?auth_token='+AuthService.authToken,
        'POST',
        localFavoritesFolder
      )
      .success(function(data, status){
        console.log('updateFavoritesFolder done: '+AuthService.currentUser.user_id+'_localFavoritesFolder');
        localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', data);
        hideSyncing();
        deferred.resolve(data);
      })
      .error(function(){
        console.log('updateFavoritesFolder failed');
        hideSyncing();
        deferred.reject();
      });
      return deferred.promise;
    }

    var addLocalContentForPresentationLogo = function(presentation){
      var waitForDownload = $q.defer();

      var source_asset_id = presentation.logo_asset_id;
      var content_id = presentation.logo_content_id;
      var content_file_version = presentation.logo_content_file_version;

      var localContents = localStorageService.get('localContents');

      if(source_asset_id && !localContents.hasOwnProperty(''+content_id) || localContents[''+content_id]!=content_file_version){
        console.log('content_id: '+content_id+' needs update');
        if(!window.useLocalFileSystem){
          console.log('not support local file, skip download file');

          var localContents = localStorageService.get('localContents');
          localContents[''+content_id] = content_file_version;
          localStorageService.set('localContents', localContents);

          waitForDownload.resolve();
        }
        else {
          var fileSrc = GlobalService.apiUrl+'assets/'+source_asset_id+'?auth_token='+AuthService.authToken;

          var filePath = localContentPath+content_id;

          var fileTransfer = new FileTransfer();

          console.log('start download (logo): '+content_id);
          showSyncing();
          fileTransfer.download(
            fileSrc,
            filePath,
            function(entry) {
                console.log("download complete: "+content_id);
                hideSyncing();

                var localContents = localStorageService.get('localContents');
                localContents[''+content_id] = content_file_version;
                localStorageService.set('localContents', localContents);

                var localAssetToContent = localStorageService.get('localAssetToContent');
                localAssetToContent[''+source_asset_id] = ''+content_id;
                localStorageService.set('localAssetToContent', localAssetToContent);

                waitForDownload.resolve();
            },
            function(error) {
                console.log("download error source " + error.source);
                console.log("download error target " + error.target);
                console.log("upload error code" + error.code);
                hideSyncing();
                waitForDownload.reject();
            },
            false,
            null
          );
        }
      }
      else{
        waitForDownload.resolve();
      }

      return waitForDownload.promise;
    }

    var addLocalContentByFavorite = function(favorite){
      var deferred = $q.defer();
      var waitForDownload = $q.defer();
      var waitForDownloadThumbnail = $q.defer();

      var source_asset_id = favorite.source_asset_id;
      var favorite_asset_id = favorite.favorite_asset_id;
      var favorite_content_type = favorite.content_type;
      var content_id = favorite.content_id;
      var content_file_version = favorite.content_file_version;

      //GET FILE IF NOT EXISTS

      var localContents = localStorageService.get('localContents');

      // if no content yet or content is not up to date
      if(!localContents.hasOwnProperty(''+content_id) || localContents[''+content_id]!=content_file_version){
        console.log('content_id: '+content_id+' needs update');

        if(!window.useLocalFileSystem){
          console.log('not support local file, skip download file');
          waitForDownload.resolve();
          waitForDownloadThumbnail.resolve();

          var localContents = localStorageService.get('localContents');
          localContents[''+content_id] = content_file_version;
          localStorageService.set('localContents', localContents);
        }
        else {
          var fileSrc = GlobalService.apiUrl+'assets/'+favorite.favorite_asset_id+'?auth_token='+AuthService.authToken;
          var thumbnailSrc = GlobalService.apiUrl+'assets/'+favorite.favorite_asset_id+'/thumbnail?auth_token='+AuthService.authToken;

          var filePath = localContentPath+content_id;
          if(favorite_content_type=='pdf'){
            filePath = filePath+'.pdf';
          }
          var fileThumbnailPath = localContentPath+'thumbnail_'+content_id;

          var fileTransfer = new FileTransfer();

          console.log('start download: '+content_id);
          showSyncing();
          fileTransfer.download(
            fileSrc,
            filePath,
            function(entry) {
                console.log("download complete: "+content_id);
                hideSyncing();

                waitForDownload.resolve(entry);
            },
            function(error) {
                console.log("download error source " + error.source);
                console.log("download error target " + error.target);
                console.log("upload error code" + error.code);
                hideSyncing();
                waitForDownload.reject();
            },
            false,
            null
          );

          console.log('start download: thumbnail_'+content_id);
          showSyncing();
          fileTransfer.download(
            thumbnailSrc,
            fileThumbnailPath,
            function(entry){
              console.log("download complete: thumbnail_"+content_id);
              hideSyncing();
              waitForDownloadThumbnail.resolve(entry);
            },
            function(error){
              console.log("download error source " + error.source);
              console.log("download error target " + error.target);
              console.log("upload error code" + error.code);
              hideSyncing();
              waitForDownloadThumbnail.reject();
            },
            false,
            null
          );
        }
      }
      else {
        waitForDownload.resolve();
        waitForDownloadThumbnail.resolve();
      }

      $q.all([waitForDownload, waitForDownloadThumbnail]).then(
        function(){
          var localContents = localStorageService.get('localContents');
          localContents[''+content_id] = content_file_version;
          localStorageService.set('localContents', localContents);

          var localAssetToContent = localStorageService.get('localAssetToContent');
          localAssetToContent[''+source_asset_id] = ''+content_id;
          localAssetToContent[''+favorite_asset_id] = ''+content_id;
          localStorageService.set('localAssetToContent', localAssetToContent);
          deferred.resolve();
        },
        function(){
          deferred.reject();
        }
      );

      return deferred.promise;
    }

    var removeLocalContentByFavorite = function(favorite){
      // check for other people if they need the file
      var source_asset_id = favorite.source_asset_id;
      var favorite_asset_id = favorite.favorite_asset_id;
      var favorite_content_type = favorite.content_type;
      var content_id = favorite.content_id;

      var localAssetToContent = localStorageService.get('localAssetToContent');

      delete localAssetToContent[''+source_asset_id];
      delete localAssetToContent[''+favorite_asset_id];
      localStorageService.set('localAssetToContent', localAssetToContent);

      // if there are others using this content, leave it
      var exist = false;
      for(var assetId in localAssetToContent){
        var contentId = localAssetToContent[''+assetId];
        if(content_id==contentId){
          exist = true;
        }
      }

      var waitForRemove = $q.defer();
      if(!exist){
        if(!window.useLocalFileSystem){
          waitForRemove.resolve();
        }
        else{
          console.log('remove file: '+content_id);
          window.resolveLocalFileSystemURL(localContentPath+'thumbnail_'+content_id, function(entry){
            entry.remove(function(){
            });
          });

          var filePath = localContentPath+content_id;
          if(favorite_content_type=='pdf'){
            filePath = filePath+'.pdf';
          }

          window.resolveLocalFileSystemURL(filePath, function(entry){
            console.log('file found. removing: '+entry.toURL());
            entry.remove(function(){
              var localContents = localStorageService.get('localContents');
              delete localContents[''+content_id];
              localStorageService.set('localContents', localContents);
              console.log('file remove successfully.');
              waitForRemove.resolve();
            }, function(){
              console.log('failed to remove');
              waitForRemove.resolve();
            });
          }, function(){
            console.log('file might be already removed');
            waitForRemove.resolve();
          });
        }
      }
      else{
        waitForRemove.resolve();
      }

      return waitForRemove.promise;
    }

    var removeLocalFileList = function(){
      localStorageService.remove('localContents');
      localStorageService.remove('localAssetToContent');
      localStorageService.remove('localAssetToPresentation');
      localStorageService.remove('localSlideToContent');
      if(AuthService.currentUser){
        localStorageService.remove(AuthService.currentUser.user_id+'_localPresentationsFolder');
        localStorageService.remove(AuthService.currentUser.user_id+'_localFavoritesFolder');
      }

      initLocalDataObject();
    }

    var deferredFav;
    var syncFavorites = function(){
      if(lockFavorites) return deferredFav.promise;

      console.log('start sync favorites');

      deferredFav = $q.defer();
      lockFavorites = true;

      compareFavoriteVersion().then(function(needSync){
        if(!needSync){
          console.log('favorites folder is already up to date');
          deferredFav.resolve();
          lockFavorites=false;
          return;
        }
        var oldLocalFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
        var oldLocalFavoritesList = oldLocalFavoritesFolder.favorites;
        if(!oldLocalFavoritesList){
          oldLocalFavoritesList = [];
        }

        var waitForFavoritesFolder = $q.defer();
        updateFavoritesFolder().then(function(data){
          waitForFavoritesFolder.resolve(data);
        }, function(){
          waitForFavoritesFolder.reject();
        });

        waitForFavoritesFolder.promise.then(function(data){

          var favoritesFolders = data.folders;
          var favoritesAssets = data.assets;
          var favoritesList = data.favorites;

          var localContents = localStorageService.get('localContents');

          var localAssetToContent = localStorageService.get('localAssetToContent');


          var waitForRemoveAll = [];
          //REMOVE FILE IF NOT EXIST IN NEW FAVORITES
          oldLocalFavoritesList.forEach(function(oldFavorite){
            var exist = false;
            favoritesList.forEach(function(favorite){
              if(favorite.content_id==oldFavorite.content_id){
                exist=true;
              }
            });
            if(!exist){
              // console.log('not exist. delete.');
              waitForRemoveAll.push(removeLocalContentByFavorite(oldFavorite));
            }
            else{
              // console.log('exist. keep.');
            }
          });

          $q.all(waitForRemoveAll).then(function(){
            var waitForDownloads = [];
            console.log('removing done');

            //should use favoritesFolder.asset.forEach instead..
            favoritesList.forEach(function(favorite){
              var promiseForFileAndThumbnail = addLocalContentByFavorite(favorite);
              waitForDownloads.push(promiseForFileAndThumbnail);
            });

            $q.all(waitForDownloads).then(function(data){
              console.log('sync favorites completed');
              deferredFav.resolve();
              lockFavorites=false;
            }, function(){
              console.log('sync favorites failed');
              deferredFav.reject();
              lockFavorites=false;
            });
          });
        }, function(){
          // waitForFavoritesList and waitForFavoritesFolder failed
          console.log('sync favorites failed');
          deferredFav.reject();
          lockFavorites=false;
        });
      }, function(){
        console.log('cannot get favorites folder version');
        deferredFav.resolve();
        lockFavorites=false;
      });

      return deferredFav.promise;

    }

    var comparePresentationVersion = function(){
      var deferred = $q.defer();

      GlobalService.proxyRequest(
        'presentations_version?auth_token='+AuthService.authToken,
        'GET'
      )
      .success(function(data){
        var needSync = false;
        var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');

        if(!localPresentationsFolder.currentFolder || localPresentationsFolder.currentFolder.folder_version!==data.folder_version){
          console.log('presentations folder_version changed');
          needSync = true;
        }

        var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
        for(var ii=0; ii<data.file_versions.length; ii++){
          var localAsset = localAssetToPresentation[''+data.file_versions[ii].asset_id];
          if(!localAsset || localAsset.presentation.file_version!==data.file_versions[ii].file_version){
            console.log('asset_id '+data.file_versions[ii].asset_id+'presentations file_version changed');
            needSync = true;
            break;
          }
        }
        deferred.resolve(needSync);
      })
      .error(function(){
        deferred.reject();
      })

      return deferred.promise;
    }

    var compareFavoriteVersion = function(){
      var deferred = $q.defer();

      GlobalService.proxyRequest(
        'favorites_version?auth_token='+AuthService.authToken,
        'GET'
      )
      .success(function(data){
        var needSync = false;
        var localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
        var rootFavoritesFolder = null;
        for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
          if(localFavoritesFolder.folders[ii].favorite_root==true){
            rootFavoritesFolder = localFavoritesFolder.folders[ii];
            break;
          }
        }

        if(!rootFavoritesFolder || rootFavoritesFolder.folder_version!==data.folder_version){
          console.log('favorites folder_version changed');
          needSync = true;
        }
        deferred.resolve(needSync);
      })
      .error(function(){
        deferred.reject();
      })

      return deferred.promise;
    }

    var compareBothVersion = function(){
      var deferred = $q.defer();

      $q.all(comparePresentationVersion, compareFavoriteVersion).then(
        function(needSyncs){
          deferred.resolve(needSyncs[0]||needSyncs[1]);
        },
        function(){
          deferred.reject();
        }
      );

      return deferred.promise;
    }

    var updatePresentationsFolder = function(){
      var deferred = $q.defer();

      console.log('start updatePresentationsFolder');
      showSyncing();

      var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');
      var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
      var userAssetToPresentation = {};

      localPresentationsFolder.assets.forEach(function(asset){
        if(localAssetToPresentation.hasOwnProperty(''+asset.id)){
          userAssetToPresentation[''+asset.id] = localAssetToPresentation[''+asset.id];
        }
      });

      GlobalService.proxyRequest(
        'sync_presentations?auth_token='+AuthService.authToken,
        'POST',
          {
            'folder': localPresentationsFolder,
            'assets': userAssetToPresentation
          }
      )
      .success(function(data, status){
        console.log('updatePresentationsFolder done: '+AuthService.currentUser.user_id+'_localPresentationsFolder');
        localStorageService.set(AuthService.currentUser.user_id+'_localPresentationsFolder', data.folder);
        hideSyncing();
        deferred.resolve(data);
      })
      .error(function(){
        console.log('updatePresentationsFolder failed');
        hideSyncing();
        deferred.reject();
      });


      return deferred.promise;
    }

    var timer;
    var deferredPres;
    var syncPresentations = function(){
      if(lockPresentations) return deferredPres.promise;

      lockPresentations = true;
      deferredPres = $q.defer();
      timer = new Date();

      var waitForPresentationsFolder = $q.defer();
      var waitForPresentations = $q.defer();

      console.log('start sync presentations');

      comparePresentationVersion().then(function(needSync){
        if(!needSync){
          console.log('presentations are already up to date');
          deferredPres.resolve();
          lockPresentations=false;
          return;
        }

        updatePresentationsFolder().then(function(data){
          waitForPresentationsFolder.resolve(data);
        }, function(){
          waitForPresentationsFolder.reject();
        });

        waitForPresentationsFolder.promise.then(function(data){
          var presentationsFolder  = data.folder;
          var presentationAssets = presentationsFolder.assets;

          var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
          var localSlideToContent = localStorageService.get('localSlideToContent');

          var presentationData = data.assets;
          var newAssetIds = data.new_asset_ids;
          var newPresentationIds = data.new_presentation_ids;
          var newSlideIds = data.new_slide_ids;
          var deletedSlideIds = data.deleted_slide_ids;

          // presentationData = [{asset_id: 0, presentation: {}, presentation_slides: []]
          // go through existing key asset on local, if not exist in server data, remove
          // including delete 'local99' and replace with new one from server
          var failedAssetIds = [];
          var deletedAssetIds = [];
          for(var key in localAssetToPresentation){
            if(localAssetToPresentation[key].presentation.owner_id!==AuthService.currentUser.user_id) continue;
            var localAssetId = key;
            if(newAssetIds[localAssetId]==='failed'){
              failedAssetIds.push(localAssetId);
              continue;
            }

            var deleted = true;
            for(var ii=0; ii<presentationData.length; ii++){
              if(localAssetId===(''+presentationData[ii].asset_id)){
                deleted = false;
                break;
              }
            }
            if(deleted){
              deletedAssetIds.push(localAssetId);
            }
          }

          deletedAssetIds.forEach(function(assetId){
            localAssetToPresentation[assetId].presentation_slides.forEach(function(presentation_slide){
              GlobalService.deleteKey(localSlideToContent, ''+presentation_slide.id);
            });
            GlobalService.deleteKey(localAssetToPresentation, assetId);
          });
          console.log('remove deleted presentations done');

          failedAssetIds.forEach(function(assetId){
            // do something !
          });

          deletedSlideIds.forEach(function(slideId){
            GlobalService.deleteKey(localSlideToContent, ''+slideId);
          });

          var waitForLogos = [];
          for(var ii=0; ii<presentationData.length; ii++){
            presentationData[ii].presentation_slides.forEach(function(presentation_slide){
              localSlideToContent[''+presentation_slide.id] = ''+presentation_slide.content_id;
            });
            localAssetToPresentation[''+presentationData[ii].asset_id] = {
              'presentation': presentationData[ii].presentation,
              'presentation_slides': presentationData[ii].presentation_slides
            };

            waitForLogos.push(addLocalContentForPresentationLogo(presentationData[ii].presentation));
          }

          localStorageService.set('localAssetToPresentation', localAssetToPresentation);
          localStorageService.set('localSlideToContent', localSlideToContent);

          var newIds = {
            'newAssetIds': newAssetIds,
            'newPresentationIds': newPresentationIds,
            'newSlideIds': newSlideIds
          };

          $q.all(waitForLogos).then(function(){
            waitForPresentations.resolve(newIds);
          }, function(){
            console.log('presentation logos not 100% completed. ignored.');
            waitForPresentations.resolve(newIds);
          });

        }, function(){
          waitForPresentations.reject();
        });

        waitForPresentations.promise.then(function(newIds){
          console.log('sync presentations completed ('+((new Date())-timer)+'ms)');
          deferredPres.resolve(newIds);
          lockPresentations=false;
        },function(){
          console.log('sync presentations failed');
          deferredPres.reject();
          lockPresentations=false;
        });
      },
      function(){
        console.log('cannot get presentations version');
        deferredPres.resolve();
        lockPresentations=false;
      });

      return deferredPres.promise;
    }


    var deferredPresAndFav;
    var syncPresentationsAndFavorites = function(){
      if(lockPresAndFav) return deferredPresAndFav.promise;

      lockPresAndFav = true;
      deferredPresAndFav = $q.defer();
      AuthService.updateCurrentUser();
      GlobalService.testServer().then(function(){
        console.log('start sync presentations and favorites');
        $q.all([syncFavorites(), syncPresentations()]).then(function(data){
          deferredPresAndFav.resolve(data);
          lockPresAndFav = false;
        },function(){
          deferredPresAndFav.reject();
          lockPresAndFav = false;
        });
      },function(){
        console.log('sync presentations and favorites failed');
        deferredPresAndFav.reject();
        lockPresAndFav = false;
      });
      return deferredPresAndFav.promise;
    }

    return {
      syncFavorites: syncFavorites,
      syncPresentations: syncPresentations,
      addLocalContentByFavorite: addLocalContentByFavorite,
      removeLocalContentByFavorite: removeLocalContentByFavorite,
      compareBothVersion: compareBothVersion,
      comparePresentationVersion: comparePresentationVersion,
      compareFavoriteVersion: compareFavoriteVersion,
      updateFavoritesFolder: updateFavoritesFolder,
      updatePresentationsFolder: updatePresentationsFolder,
      syncPresentationsAndFavorites: syncPresentationsAndFavorites,
      removeLocalFileList: removeLocalFileList
    }
});
