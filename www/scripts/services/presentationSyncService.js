angular.module('searaClientApp')
  .factory('PresentationSyncService', function($q, GlobalService, AuthService, localStorageService, LocalPathService, LocalPresentationsService, LocalPresentationSlidesService, FileSyncService){

  var localContentPath = LocalPathService.localContentPath;
  var localDataPath = LocalPathService.localDataPath;

  var mappedIds = {};
  // map temporary id that still used in view with the real id
  // when post to server need to use real id, but when in local still need temporary id
  var mapArguments = function(args, newArgs){
    for(var ii=0; ii<args.length; ii++){
      args[ii] = newArgs[ii];
    }
  }

  var getMappedArguments = function(args){
    var newArgs = [];
    // clone arguments
    for(var ii=0; ii<args.length; ii++){
      newArgs[ii] = args[ii];
    }

    // check each argument, if stringified argument has no id to replace, it is possibly File
    // don't stringify File as it will break
    for(var ii=0; ii<newArgs.length; ii++){
      var jsonString = JSON.stringify(newArgs[ii]);
      var gotSomeIdToReplace = false;
      for(var key in mappedIds){
        if(jsonString.indexOf(key)!=-1){
          gotSomeIdToReplace = true;
          jsonString = jsonString.replace(key, mappedIds[key]);
        }
      }
      if(gotSomeIdToReplace){
        newArgs[ii] = JSON.parse(jsonString);
      }
    }

    return newArgs;
  }

  var setMappedIds = function(newIds){
    if(newIds){
      for(var key in newIds.newAssetIds){
        mappedIds[key] = newIds.newAssetIds[key];
      }
      for(var key in newIds.newPresentationIds){
        mappedIds[key] = newIds.newPresentationIds[key];
      }
      for(var key in newIds.newSlideIds){
        mappedIds[key] = newIds.newSlideIds[key];
      }
    }
  }

  var ensureSyncBeforeUpdate = function(){
    var deferred = $q.defer();

    if(window.useLocalStorage){
      FileSyncService.compareBothVersion().then(
        function(needSync){
          if(needSync){
            FileSyncService.syncPresentationsAndFavorites().then(
              function(data){
                var newIds = data[1];
                setMappedIds(newIds);
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

  var syncAndGetPresentation = function(assetId){

    var deferred = $q.defer();

    var syncDeferred = $q.defer();
    FileSyncService.syncPresentationsAndFavorites().then(
      function(){
        console.log('sync presentation done');
        syncDeferred.resolve(true);
      },
      function(){
        console.log('sync presentation failed');
        syncDeferred.resolve(false);
      }
    );

    var thatArgs = arguments;
    syncDeferred.promise.then(
      function(){
        var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
        mapArguments(thatArgs, getMappedArguments(thatArgs));
        if(localAssetToPresentation[''+assetId]){
          var presentationData = localAssetToPresentation[''+assetId];
          var data = {};
          data.asset_id = assetId
          data.presentation = presentationData.presentation;
          data.presentation_slides = presentationData.presentation_slides;
          data.presentation_slides = data.presentation_slides.sort(function(slideA, slideB){
            return slideA.position-slideB.position;
          });

          console.log('get presentation from local');

          if(data.presentation.owner_id!=AuthService.currentUser.user_id){
            deferred.reject('unauthorized');
          }
          else{
            deferred.resolve(data);
          }

        }
        else deferred.reject('presentation data not exist in local');
      }
    );

    return deferred.promise;
  }

  var addPresentation = function(presentationName){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      var duplicatedNameMessage = 'Presentation with the same name exists';
      var invalidNameMessage = 'Presentation\'s name can only contain alphabetical characters, numbers, and space';
      GlobalService.proxyRequest(
        'presentations?auth_token='+AuthService.authToken,
        'POST',
        {
          name: presentationName
        }
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
        console.log('Add presentation done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(data, status){
        console.log('Add presentation failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          mapArguments(thatArgs, originalArgs);

          if(data===null){
            if(window.useLocalStorage){
              var result = LocalPresentationsService.action_create(presentationName);
              if(result.success){
                console.log('Add presentation done (local)');
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
                  localDeferred.reject('Add presentation failed');
                }
                console.log('Add presentation failed (local)')
              }
            }
            else{
              localDeferred.reject('Add presentation failed');
            }
          }
          else {
            if(window.useLocalStorage){
              console.log('Reload presentations folder and save to local');
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

  var editPresentationAsset = function(presentation, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    var duplicatedNameMessage = 'Presentation with the same name exists';
    var invalidNameMessage = 'Presentation\'s name can only contain alphabetical characters, numbers, and space';

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'assets/'+assetId+'?auth_token='+AuthService.authToken,
        'PUT',
        presentation
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
        console.log('Edit presentation done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Edit presentation failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          mapArguments(thatArgs, originalArgs);

          if(data===null){
            if(window.useLocalStorage){
              var result = LocalPresentationsService.action_asset_update(presentation, assetId);
              if(result.success){
                console.log('Rename presentation done (local)');
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
                  localDeferred.reject('Rename presentation failed');
                }
                console.log('Rename presentation failed (local)')
              }
            }
            else{
              localDeferred.reject('Rename presentation failed');
            }
          }
          else{
            if(window.useLocalStorage){
              console.log('Reload presentations folder and save to local');
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

  var editPresentation = function(presentation, logoFile, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;


    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));
      GlobalService.proxyUpload(
        'presentations/'+assetId+'/?auth_token='+AuthService.authToken,
        'PUT',
        presentation,
        logoFile
      )
      .success(function(data){
        if(data.error_message){
          console.log('Edit presentation failed (server)');
          serverDeferred.reject(data.error_message);
          return;
        }
        console.log('Edit presentation done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Edit presentation failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          mapArguments(thatArgs, originalArgs);

          if(window.useLocalStorage){
            var timestamp, result;
            if(data){
              timestamp = data.presentation.file_version;
              result = LocalPresentationsService.action_update(data.presentation, assetId, timestamp);
            }
            else{
              timestamp = ''+(new Date().getTime());
              result = LocalPresentationsService.action_update(presentation, assetId, timestamp);
            }
            if(result.success){
              localDeferred.resolve(result);
              console.log('Edit presentation done (local)');
            }
            else{
              localDeferred.reject('Edit presentation failed');
              console.log('Edit presentation failed (local');
            }
          }
          else{
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

  var deletePresentation = function(assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'assets/'+assetId+'?auth_token='+AuthService.authToken,
        'DELETE'
      )
      .success(function(data){
        console.log('Delete presentation done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Delete presentation failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          mapArguments(thatArgs, originalArgs);

          if(data===null){
            if(window.useLocalStorage){
              var result = LocalPresentationsService.action_destroy(assetId);
              if(result.success){
                localDeferred.resolve(result);
                console.log('Delete presentation done (local)');
              }
              else{
                localDeferred.reject('Delete presentation failed');
                console.log('Delete presentation failed (local)');
              }
            }
            else{
              localDeferred.reject('Delete presentation failed');
            }
          }
          else{
            if(window.useLocalStorage){
              console.log('Reload presentations folder and save to local');
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

  var addPresentationSlides = function(selectedAssets, presentationSlide, presentation, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var selectedAssetIds = [];
    selectedAssets.forEach(function(asset){
      selectedAssetIds.push(asset.id);
    });

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'presentation_slides/bulk?auth_token='+AuthService.authToken,
        'POST',
        {
          'asset_ids': selectedAssetIds,
          'presentation_id': presentationSlide.presentation_id,
          'transition_type': presentationSlide.transition_type,
          'transition_speed': presentationSlide.transition_speed
        }
      )
      .success(function(data){ // return presentation, presentation_slides
        console.log('Add presentation slides done (server)');
        serverDeferred.resolve(data);
      })
      .error(function(){
        console.log('Add presentation slides failed (server)');
        if(status==401){
          serverDeferred.reject('Unauthorized');
          return;
        }

        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(data){
          mapArguments(thatArgs, originalArgs);

          if(data){
            if(window.useLocalStorage){
              console.log('Reload presentation and save to local');
            }
            localDeferred.resolve(true);
          }
          else{
            if(window.useLocalStorage){
              // cannot add from cloud if offline (cannot connect to server)
              var localAssetToContent = localStorageService.get('localAssetToContent');
              var isInCloud = true;
              for(var ii=0;ii<selectedAssetIds.length; ii++){
                for(var key in localAssetToContent){
                  if((''+selectedAssetIds[ii])===key){
                    isInCloud = false;
                    break;
                  }
                }
                if(!isInCloud) break;
              }
              if(isInCloud){
                localDeferred.reject('Cannot add from cloud');
                return;
              }
              var file_version =  ''+(new Date()).getTime();
              if(LocalPresentationSlidesService.action_create_bulk(selectedAssets, presentationSlide, presentation, assetId, file_version)){
                console.log('Add presentation slides done (local)');
                localDeferred.resolve(true);
              }
              else{
                console.log('Add presentation slides failed (local)');
                localDeferred.reject('Add presentation slides failed');
              }
            }
            else{
              console.log('Add presentation slides failed (local)');
              localDeferred.reject('Add presentation slides failed');
            }
          }
        }, function(message){
          localDeferred.reject(message);
        }
      );
    });

    return localDeferred.promise;
  }

  var editPresentationSlide = function(presentationSlide, presentation, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'presentation_slides/'+presentationSlide.id+'/?auth_token='+AuthService.authToken,
        'PUT',
        presentationSlide
      )
      .success(function(data){
        file_version = data.file_version;
        console.log('edit presentation slide done (server)');
        serverDeferred.resolve(file_version);
      })
      .error(function(){
        console.log('edit presentation slide failed (server)');
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(file_version){
          mapArguments(thatArgs, originalArgs);

          if(window.useLocalStorage){
            // if request to server success, will use the same file_version as server
            if(!file_version) file_version = ''+(new Date()).getTime();
            // might do the same as add slides, if file_version exists, do nothing, leave sync to reload, later
            if(LocalPresentationSlidesService.action_update(presentationSlide, presentation, assetId, file_version)){
              console.log('edit presentation slide done (local)');
            }
            else{
              console.log('edit presentation slide failed (local)');
            }
            localDeferred.resolve(true);
          }
          else if(file_version===null){
            localDeferred.reject('Edit presentation slide failed');
          }
          else{ // post request success, no localStorage
            localDeferred.resolve(true);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });

    return localDeferred.promise;
  }

  var editTransition = function(presentationSlide, presentation, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'presentation_slides/'+presentationSlide.id+'/?auth_token='+AuthService.authToken,
        'PUT',
        presentationSlide
      )
      .success(function(data){
        file_version = data.file_version;
        console.log('Edit transition done (server)');
        serverDeferred.resolve(file_version);
      })
      .error(function(){
        console.log('Edit transition failed (server)');
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(file_version){
          mapArguments(thatArgs, originalArgs);

          if(window.useLocalStorage){
            if(!file_version) file_version =  ''+(new Date()).getTime();
            if(LocalPresentationSlidesService.action_update(presentationSlide, presentation, assetId, file_version)){
              console.log('Edit transition done (local)');
            }
            else{
              console.log('Edit transition failed (local)');
            }
            localDeferred.resolve(true);
          }
          else if(file_version===null){
            localDeferred.reject('Edit transition failed');
          }
          else{
            localDeferred.resolve(true);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });
    return localDeferred.promise;
  }

  var deletePresentationSlide = function(presentationSlide, presentation, assetId){
    var serverDeferred = $q.defer();
    var localDeferred = $q.defer();

    var originalArgs = [].slice.call(arguments);
    var thatArgs = arguments;

    ensureSyncBeforeUpdate().then(function(){
      mapArguments(thatArgs, getMappedArguments(thatArgs));

      GlobalService.proxyRequest(
        'presentation_slides/'+presentationSlide.id+'/?auth_token='+AuthService.authToken,
        'DELETE'
      )
      .success(function(data){
        file_version = data.file_version;
        console.log('delete presentation slide done (server)');
        serverDeferred.resolve(file_version);
      })
      .error(function(){
        console.log('delete presentation slide failed (server)');
        serverDeferred.resolve(null);
      });

      serverDeferred.promise.then(
        function(file_version){
          mapArguments(thatArgs, originalArgs);

          if(window.useLocalStorage){
            if(!file_version) file_version = ''+(new Date()).getTime();
            if(LocalPresentationSlidesService.action_destroy(presentationSlide, presentation, assetId, file_version)){
              console.log('delete presentation slide done (local)');
            }
            else {
              console.log('delete presentation slide failed (local)');
            }
            localDeferred.resolve(true);
          }
          else if(file_version===null){
            localDeferred.reject('Delete presentation slide failed');
          }
          else{
            localDeferred.resolve(true);
          }
        },
        function(message){
          localDeferred.reject(message);
        }
      );
    });

    return localDeferred.promise;
  }

  return {
    syncAndGetPresentation: syncAndGetPresentation,
    addPresentation: addPresentation,
    editPresentationAsset: editPresentationAsset,
    editPresentation: editPresentation,
    deletePresentation: deletePresentation,
    addPresentationSlides: addPresentationSlides,
    editPresentationSlide: editPresentationSlide,
    editTransition: editTransition,
    deletePresentationSlide: deletePresentationSlide
  };
});