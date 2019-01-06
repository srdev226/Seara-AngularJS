  'use strict';

angular.module('searaClientApp')
  .factory('FolderService', function(
    $q,
    $http,
    $location,
    $rootScope,
    $timeout,
    localStorageService,
    AuthService,
    GlobalService,
    GeneralConfigService,
    LocalPathService,
    FileSyncService,
    PdfService,
    PresentationService
  ){

    var apiUrl = GlobalService.apiUrl;

    var proxyRequest = GlobalService.proxyRequest;

    var promise;

    var localContentPath = LocalPathService.localContentPath;

    var fileType = 'image';

    var showDialog= function(scope, text){
    	scope.dialogText = text;
    	$('#dialogModal').modal('show');
    }

    var random;

    var getToken = function(){
        return AuthService.authToken;
    }

    var setSelectedAssetByIndex = function(scope, index){
      scope.selectedAssetIndex = index;
      scope.selectedAssetId = scope.folderData.assets[index].id;
      scope.selectedAssetName = scope.folderData.assets[index].name;
      scope.selectedAssetContentType = scope.folderData.assets[index].content_type;
      scope.selectedAssetIsFavorited = scope.folderData.assets[index].isFavorited;
      scope.selectedAssetFavoriteId = scope.folderData.assets[index].favoriteId;
    }

    var showLoadingMask =function(delay, noTimeout){
      GlobalService.showLoadingMask(delay, noTimeout);
    }
    var hideLoadingMask =function(immediately){
      GlobalService.hideLoadingMask(immediately);
    }

    var getThumbnailSource = PresentationService.getThumbnailSource;

    var setFolder = function(data, scope, menu){

      for(var i=0; i<data.assets.length; i++){
          data.assets[i].isFavorited = false;
        for(var j=0; j<data.favorites.length; j++){
          if(data.favorites[j].source_asset_id==data.assets[i].id ||
             data.favorites[j].favorite_asset_id==data.assets[i].id
            ){
            data.assets[i].isFavorited = true;
            data.assets[i].favoriteId = data.favorites[j].id;
            break;
          }
        }
      }

      scope.canEdit = false;
      switch(data.currentFolder.permission){
      case 'cloud':
        if($rootScope.isSuper || $rootScope.isAdmin){
          scope.canEdit = true;
        }
        break;
      case 'user':
        if(data.currentFolder.creator_id && AuthService.currentUser.user_id == data.currentFolder.creator_id){
          scope.canEdit = true;
        }
        break;
      case 'read_only':
        scope.canEdit = true;
        if(scope.prefixPath=='/cloud/index'){
          scope.showAddFolder=scope.showAddContent=false;
          scope.hideEditMenu = true;
        }
      }

      scope.folderData = data;

      scope.folderData.folders = scope.folderData.folders.sort(function(folderA, folderB){
        if(folderA.permission=='read_only' && folderB.permission!='read_only'){
            return -1;
        }
        else if(folderA.permission!='read_only' && folderB.permission=='read_only'){
            return 1;
        }
        if (folderA.name.toLowerCase()>folderB.name.toLowerCase()) return 1;
        else if (folderA.name.toLowerCase()<folderB.name.toLowerCase()) return -1;
        else return 0;
      });

      scope.folderData.assets = scope.folderData.assets.sort(function(assetA, assetB){
        if (assetA.name.toLowerCase()>assetB.name.toLowerCase()) return 1;
        else if (assetA.name.toLowerCase()<assetB.name.toLowerCase()) return -1;
        else return 0;
      });

      var idx = 0;
      scope.thumbnailSource = [];

      for(var ii=0; ii<scope.folderData.assets.length; ii++){
        var asset = scope.folderData.assets[ii];
        if(asset['deleted']){
          scope.folderData.assets.splice(ii, 1);
          ii--;
        }
        else{
          scope.thumbnailSource[idx++] = getThumbnailSource(asset.id);
        }

      }


      if(menu=='cloud' || menu=='favorites') {
        $rootScope.titleName = data.currentFolder.name;
      }

      else if(menu=='assetBrowserDialog'){
        scope.dialogTitleName = data.currentFolder.name;
        scope.currentFolderName = data.currentFolder.name;
        scope.folderType = 'cloud';
        scope.backPath = '';
        if(data.parentFolder){
          scope.backPath = data.parentFolder.path;
        }
        if(data.currentFolder.path.match('/root/Users.*Favorites')) scope.folderType = 'favorites';

        scope.folderData.assets.forEach(function(asset){
          asset.thumbnailSource = getThumbnailSource(asset.id);
        });
        scope.currentDialogPath = data.currentFolder.path;
      }


    }

    return {
      getImageOrientation: PresentationService.getImageOrientation,

      //should call as function, otherwise it only set at the beginning and don't refresh if re-log in
      setFolder: setFolder,

      browse: function(scope, path, token, userId, groupId, menu){
        var deferred = $q.defer();
        random = Math.random();
        showLoadingMask();
        scope.folderLoading = true;
        proxyRequest(
          'folders/?path='+path+'&auth_token='+getToken(),
          'GET'
        )
        .success(function (data, status){
          if(data.error_type){
            hideLoadingMask();
            GlobalService.showSimpleDialog('Cannot access folder or folder not exists');
            $location.path('/');
          }
          setFolder(data, scope, menu);
          scope.folderLoading = false;
          hideLoadingMask();
          deferred.resolve();
        })
        .error(function(data, status){
          hideLoadingMask();
          if(status==401) return;
          if(!$rootScope.isOnline){
            GlobalService.showSimpleDialog('No connection. Cannot view folder.');
          }
          else{
            GlobalService.showSimpleDialog('Cannot connect to the server');
          }
          deferred.reject();
        });
        return deferred.promise;
      },

  	  browseByType: function(scope, path, type, token, userId, groupId, menu){
        var deferred = $q.defer();
        random = Math.random();
        showLoadingMask();
  			proxyRequest(
  				'folders/?path='+path+'&type='+type+'&auth_token='+getToken(),
  				'GET'
  			)
  			.success(function (data, status){
          if(menu=='folderBrowserDialog'){
            hideLoadingMask();
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
            return;
          }
  				for(var i=0; i<data.assets.length; i++){
  					data.assets[i].isFavorited = false;
  					for(var j=0; j<data.favorites.length; j++){
  						if(data.favorites[j].source_asset_id==data.assets[i].id ||
  							 data.favorites[j].favorite_asset_id==data.assets[i].id
  							){
  							data.assets[i].isFavorited = true;
  							data.assets[i].favoriteId = data.favorites[j].id;
  							break;
  						}
            }
          }
          switch(data.currentFolder.permission){
            case 'cloud':
              if($rootScope.canEditCloud){
                scope.canEdit = true;
              }
              break;
            case 'user':
              if(AuthService.currentUser.user_id == data.currentFolder.creator_id){
                scope.canEdit = true;
              }
            }

    				scope.folderData = data;

            scope.folderData.folders = scope.folderData.folders.sort(function(folderA, folderB){
              if(folderA.permission=='read_only' && folderB.permission!='read_only'){
                  return -1;
              }
              else if(folderA.permission!='read_only' && folderB.permission=='read_only'){
                  return 1;
              }
              if (folderA.name.toLowerCase()>folderB.name.toLowerCase()) return 1;
              else if (folderA.name.toLowerCase()<folderB.name.toLowerCase()) return -1;
              else return 0;

              //sort should return int not bool.....
              // return folderA.name.toLowerCase()>folderB.name.toLowerCase();
            });

            scope.folderData.assets = scope.folderData.assets.sort(function(assetA, assetB){
              if (assetA.name.toLowerCase()>assetB.name.toLowerCase()) return 1;
              else if (assetA.name.toLowerCase()<assetB.name.toLowerCase()) return -1;
              else return 0;
            });

            if(menu=='cloud') {
              $rootScope.titleName = data.currentFolder.name;
            }
            else if(menu=='assetBrowserDialog'){
              scope.dialogTitleName = data.currentFolder.name;
              scope.currentFolderName = data.currentFolder.name;
              scope.folderType = 'cloud';
              scope.backPath = '';
              if(data.parentFolder){
                scope.backPath = data.parentFolder.path;
              }
              if(data.currentFolder.path.match('/root/Users.*Favorites')) scope.folderType = 'favorites';

              scope.folderData.assets.forEach(function(asset){
                asset.thumbnailSource = getThumbnailSource(asset.id);
              });
              scope.currentDialogPath = path;
            }

            hideLoadingMask();
            deferred.resolve();
    			})
    			.error(function(data, status){
            hideLoadingMask();
            deferred.reject();
    		});

        return deferred.promise;
  	  },

      searchFolder: function(scope, token, userId, groupId, menu){
        scope.searchText = scope.folderSearchText;
        random = Math.random();
        showLoadingMask();
        scope.folderLoading = true;
        $('input').blur();
        proxyRequest(
          'folders/search?searchIn='+scope.searchInFolder+'&q='+encodeURIComponent(scope.searchText)+'&auth_token='+getToken(),
          'GET'
        )
        .success(function (data, status) {
          if(data.error_type){
            hideLoadingMask();
            GlobalService.showSimpleDialog('Cannot access folder or folder not exists');
            $location.path('/');
          }
          $('.folders-browser-container').css('height', '100%');
          $('.folders-browser-container').height($('.folders-browser-container').height()-34);
          $('.search-bar').removeClass('hide');

          for(var i=0; i<data.assets.length; i++){
            data.assets[i].isFavorited = false;
            for(var j=0; j<data.favorites.length; j++){
              if(data.favorites[j].source_asset_id==data.assets[i].id ||
                 data.favorites[j].favorite_asset_id==data.assets[i].id
                ){
                data.assets[i].isFavorited = true;
                data.assets[i].favoriteId = data.favorites[j].id;
                break;
              }
            }
          }

          // don't allow editting anything while searching
          scope.canEdit = false;

          scope.folderData = data;
          scope.folderData.assets = scope.folderData.assets.sort(function(assetA, assetB){
            if (assetA.name.toLowerCase()>assetB.name.toLowerCase()) return 1;
            else if (assetA.name.toLowerCase()<assetB.name.toLowerCase()) return -1;
            else return 0;
          });

          var idx = 0;
          scope.thumbnailSource = [];
          scope.folderData.assets.forEach(function(asset){
            scope.thumbnailSource[idx++] = getThumbnailSource(asset.id);
          });

          if(menu=='cloud') {
            $rootScope.titleName = data.currentFolder.name;
          }

          scope.folderLoading = false;

          hideLoadingMask();
        })
        .error(function(data, status){
          hideLoadingMask();
        });
      },

      clearSearch: function(scope){
        scope.searchText='';
        scope.folderSearchText = '';
        $('.search-bar').addClass('hide');
        $('.folders-browser-container').height('100%');

        scope.browse();
      },

  		getThumbnailSource: getThumbnailSource,

      getImageSource: PresentationService.getImageSource,

      getPdfSource: function(assetId, token){
        if(window.useLocalFileSystem){
          var localAssetToContent =  localStorageService.get('localAssetToContent');
          var localContents = localStorageService.get('localContents');
          if(localAssetToContent[''+assetId] && localContents[''+localAssetToContent[''+assetId]]){
            console.log('get pdf from local source');
            return localContentPath + localAssetToContent[''+assetId]+'.pdf';
          }
        }
        console.log('get pdf from remote source');
        return GlobalService.apiUrl+'assets/'+assetId+'?auth_token='+getToken();
      },

      showImage: function (scope, asset, token) {
        var imgSrc = this.getImageSource(asset.id);
        var promise = PresentationService.getImageOrientation(asset.image_width, asset.image_height);
        GlobalService.showLoadingMask(2000);
        promise.then(function(orientation){
          scope.imageOrientation = orientation;
          scope.imageSource = imgSrc;
          scope.imageName = scope.selectedAssetName;
          $('.full-image').css('background', 'url("'+scope.imageSource+'")');
          $('#showImageModal').modal('show');
          GlobalService.hideLoadingMask(true);
        });
      },

      previousImage: function(scope, token){
        this.traverseImage('left', scope, token);
      },

      nextImage: function(scope, token){
        this.traverseImage('right', scope, token);
      },

      traverseImage: function(direction, scope, token){
        if (scope.loadingNextImage) return;
        var indexDirection = direction=='left' ? -1 : 1;

        var index = scope.selectedAssetIndex;
        var length = scope.folderData.assets.length;
        do { index = (index+indexDirection+length)%length; }
        while (scope.folderData.assets[index].content_type!='image');

        var counterDirection = direction=='left' ? 'right' : 'left';
        scope.loadingNextImage = true;

        var currentImage = $('.full-image').addClass('full-image-hide-'+counterDirection);

        var id = 'fullImage'+index;

        currentImage.after('<div id="'+id+'"></div>');
        var newImage = $('#fullImage'+index);
        newImage.addClass('full-image full-image-hide-'+direction);

        $timeout(function(){
          currentImage.remove();
        }, 300);

        var imgSrc = this.getImageSource(scope.folderData.assets[index].id);
        var promise = PresentationService.getImageOrientation(scope.folderData.assets[index].image_width, scope.folderData.assets[index].image_height);

        GlobalService.showLoadingMask(2000);
        promise.then(function(orientation){
          scope.imageOrientation = orientation;
          scope.imageSource = imgSrc;
          setSelectedAssetByIndex(scope, index);
          scope.imageName = scope.selectedAssetName;
          scope.loadingNextImage = false;

          newImage.css('background', 'url("'+scope.imageSource+'")');
          newImage.removeClass('full-image-hide-'+direction);
          GlobalService.hideLoadingMask(true);
        });
      },

      showPdf: function(scope, assetId, token){
        if(window.isTablet){
          var ref = window.open(this.getPdfSource(assetId, token), '_blank', 'closebuttoncaption=Close,location=no,toolbarposition=bottom,disallowoverscroll=yes,EnableViewPortScale=yes');
          ref.addEventListener('exit', function() {
            ref.removeEventListener('exit', function(){});
            ref.removeEventListener('loadstart', function(){});
            ref.removeEventListener('loadstop', function(){});
            ref.removeEventListener('loaderror', function(){});
            // ref.close();
          } );
          ref.addEventListener('loadstart', function(){
            GlobalService.showLoadingMask();
            // navigator.notification.activityStart("Loading. Please wait.");
          });
          ref.addEventListener('loadstop', function(){
            GlobalService.hideLoadingMask();
            // navigator.notification.activityStop();
          });
          ref.addEventListener('loaderror', function(){
            GlobalService.hideLoadingMask();
            // navigator.notification.activityStop();
          });

        }
        else{
          window.open(this.getPdfSource(assetId, token));
        }
      },

  		hideImage: function (scope){
  			scope.imageSource = '';
        $('.show-image .centering-cell').html(
          '<div class="full-image"></div>'
        )
        $('#showImageModal').modal('hide');
  		},

  		folderMouseDown: function(scope, folder, index, interval){

        scope.selectedFolderId = folder.id;
        scope.selectedFolderName = folder.name;
        scope.holdingTimeSec = 1;
        scope.holdingTime = scope.holdingTimeSec*10; //counting number
        interval.cancel(promise);
        promise = interval(function () {
          scope.holdingTime -= 1;
          if(scope.holdingTime<=5){
            scope.selectedFolderIconIndex = index;
          }
          if(scope.holdingTime<=0){
            scope.selectedFolderIconIndex = -1;
          	scope.showFolderOptionsDialog();
            interval.cancel(promise);
          }
        }, 100); //interval

      },

      folderMouseUp: function (scope, folderPath, location, interval) {
      	scope.selectedFolderIconIndex = -1;
  			if(scope.holdingTime>0){
  				location.path(scope.prefixPath+folderPath);
  			}
  			interval.cancel(promise);
      },

      folderMouseMove: function (scope, interval){
      	scope.selectedFolderIconIndex = -1;
      	scope.holdingTime = 0;
        if(promise) {
          interval.cancel(promise);
        }
      },

      assetMouseDown: function(scope, asset, index, interval){
        setSelectedAssetByIndex(scope, index);

        if(scope.selectedAssetContentType=='image'){
          scope.onChooseImage();
        }
        else{
          scope.onChoosePdf();
        }

        if(asset.assetable_type=='Presentation'){
          scope.selectedPresentationDescription = asset.presentation.description;
          scope.selectedPresentationIsShared = (asset.presentation.shared==1);
          scope.selectedPresentationCanShare = !scope.folderData.currentFolder.locked || $rootScope.isAdmin;
        }

        scope.holdingTimeSec = 1;

        scope.holdingTime = scope.holdingTimeSec*10;
        interval.cancel(promise);
        promise = interval(function () {
          scope.holdingTime -= 1;

          if(scope.holdingTime<=5){
            scope.selectedAssetIconIndex = index;
          }

          if(scope.holdingTime<=0){
          scope.selectedAssetIconIndex = -1; //stop shaking
            if(asset.assetable_type=='Content'){
              scope.showContentOptionsDialog();
            }
            else if(asset.assetable_type=='Presentation'){
              scope.showPresentationOptionsDialog();
            }
            interval.cancel(promise);
          }
        }, 100);

      },

      assetMouseUp: function (scope, asset, interval ) {
        scope.selectedAssetIconIndex = -1;

        if(scope.holdingTime>0){
          if(asset.assetable_type=='Content'){
            if(asset.content_type=='pdf'){
              scope.showPdf(asset.id);
            }
            else if(asset.content_type=='image'){
              scope.showImage(asset);
            }

          }
          else if(asset.assetable_type=='Presentation'){
            //play the presentation
            scope.startPresentation(asset.id);
          }
        }
        interval.cancel(promise);
      },

      assetMouseMove: function (scope, interval){
      	scope.selectedAssetIconIndex = -1;
      	scope.holdingTime=0;
        if(promise) {
          interval.cancel(promise);
        }
      },

      showAddFolderDialog: function(scope){
        $('#addFolderModal').modal('show');
      },

      addFolder: function(scope, path, token){
        showLoadingMask();
      	proxyRequest(
      		'folders/?path='+path+'&auth_token='+getToken(),
      		'POST',
  				{'name': scope.addFolderName,
  				 'view_type': 'default',
  				 'asset_order_by': 'name'
  				}
  			)
  			.success(function(data, status){

          hideLoadingMask();
          if(data.error_type=='duplicated_name'){
            GlobalService.showSimpleDialog('Folder with the same name exists');
            return;
          }
          else if(data.error_type=='invalid_name'){
            GlobalService.showSimpleDialog('Folder name can only contain alphabetical characters, numbers, and space');
            return;
          }
          $('#addFolderModal').modal('hide');
          // scope.browse();
          $location.path(scope.prefixPath+data.folder.path);
  			})
      	.error(function(){
          hideLoadingMask();
          GlobalService.showSimpleDialog('Cannot connect to server');
      	});
  	  },

  	  showFolderOptionsDialog: function(){

      	$('#folderOptionsModal').modal('show');
  		},

  		showConfirmDeleteFolderDialog: function(){
  			$('#folderOptionsModal').modal('hide');
  			$('#confirmDeleteFolderModal').modal('show');
  		},

  		deleteFolder: function(scope, token){
        showLoadingMask();
  			proxyRequest(
  				'folders/'+scope.selectedFolderId+'?auth_token='+getToken(),
  				'DELETE'
  			)
    		.success(function(data){
          hideLoadingMask();
          $('#confirmDeleteFolderModal').modal('hide');
          if(data.error_type){
           GlobalService.showSimpleDialog('Cannot delete folder. Please try again.');
           return;
          }
          scope.browse();
        })
        .error(function(data){
          $('#confirmDeleteFolderModal').modal('hide');
           GlobalService.showSimpleDialog('Cannot delete folder. Please try again.');
          hideLoadingMask();
  		  });
  		},

      showEditFolderDialog: function(){
        $('#folderOptionsModal').modal('hide');
        $('#editFolderModal').modal('show');
      },

  		showFolderBrowserDialog: function(){
  			$('#contentOptionsModal').modal('hide');
  			$('#folderBrowserModal').modal('show');
  		},

  		editFolder: function(scope, token){
        showLoadingMask();
  			proxyRequest(
  				'folders/'+scope.selectedFolderId+'?auth_token='+getToken(),
  				'PUT',
  				{
  					'name': scope.selectedFolderName,
  				 	'view_type': 'default',
  				 	'asset_order_by': 'name'
  				}
  			)
  			.success(function(data, status){
          hideLoadingMask();
          if(data.error_type=='duplicated_name'){
            GlobalService.showSimpleDialog('Folder with the same name exists');
            return;
          }
          else if(data.error_type=='invalid_name'){
            GlobalService.showSimpleDialog('Folder name can only contain alphabetical characters, numbers, and space');
            return;
          }
          scope.browse();
          $('#editFolderModal').modal('hide');
  			})
      	.error(function(){
          hideLoadingMask();
      		//alert('error in editFolder');
  	    });
  		},

      showContentOptionsDialog: function(){
        $('#contentOptionsModal').modal('show');
      },

  		showConfirmDeleteAssetDialog: function(){
        //hide both
        $('#contentOptionsModal').modal('hide');
  			$('#presentationOptionsModal').modal('hide');
  			$('#confirmDeleteAssetModal').modal('show');
  		},

  		deleteAsset: function(scope, token){
        showLoadingMask();
  			proxyRequest(
  				'assets/'+scope.selectedAssetId+'?auth_token='+getToken(),
  				'DELETE'
  			)
    		.success(function(data){
          hideLoadingMask();
  				$('#confirmDeleteAssetModal').modal('hide');
    			//alert('Deleted successfully');
          scope.browse();
    		})
    		.error(function(){
          hideLoadingMask();
    			//alert('error in deleteFolder');
  		  });
  		},

      showEditContentDialog: function(){
        $('#contentOptionsModal').modal('hide');
        $('#editContentModal').modal('show');
      },

      showReuploadContentDialog: function(scope){
        $('#contentOptionsModal').modal('hide');
        scope.selectedThumbnail = null;
        scope.selectedFile = null;
        $('.file-upload-browser input[type=file]').val(null);
        scope.fileName = '';
        scope.thumbnailName = '';
        $('#reuploadContentModal').modal('show');
      },

  		showEditPresentationDialog: function(){
  			$('#presentationOptionsModal').modal('hide');
        $('#editPresentationModal').modal('show');
        // $timeout(function(){$('#editPresentationModal input').focus();},500);
  		},

  		editAsset: function(scope, token){
        showLoadingMask();
        proxyRequest(
          'assets/'+scope.selectedAssetId+'?auth_token='+getToken(),
          'PUT',
          {
            name: scope.selectedAssetName
          }
        )
        .success(function(data){
          hideLoadingMask();
          if(data.error_type=='duplicated_name'){
            GlobalService.showSimpleDialog('File with the same name exists');
            return;
          }
          else if(data.error_type=='invalid_name'){
            GlobalService.showSimpleDialog('File name can only contain alphabetical characters, numbers, and space');
            return;
          }
          $('#editContentModal').modal('hide');

          scope.folderData.assets[scope.selectedAssetIndex] = data.asset;
          //scope.browse();
        })
        .error(function(){
          hideLoadingMask();
        });
      },

      moveAsset: function(scope, token){
        showLoadingMask();
        proxyRequest(
          'assets/'+scope.selectedAssetId+'?path='+scope.selectedAssetPath+'&auth_token='+getToken(),
          'PUT'
        )
        .success(function(data){
          hideLoadingMask();
          if(data.error_type){
            switch(data.error_type){
              case 'folder_not_exists':
                GlobalService.showSimpleDialog('Folder is not exists');
                break;
              case 'permission_denied':
                GlobalService.showSimpleDialog('Unauthorized action');
                break;
              default:
                GlobalService.showSimpleDialog('Cannot move file. Please try again.');
            }
            return;
          }
          $('#folderBrowserModal').modal('hide');
          scope.browse();
        });
      },

      reuploadAsset: function(scope, token, path){
        showLoadingMask(0, true);
        GlobalService.proxyUpload('assets/'+scope.selectedAssetId+'?auth_token='+getToken(),
          'PUT',
          {
            file_type: scope.fileType
          },
          scope.selectedFile
        )
        .success(function(data, status, headers, config) {
            if(data.error_message){
              hideLoadingMask();
              GlobalService.showSimpleDialog(data.error_message);
              return;
            }
            var deferred = $q.defer();
            if(data.content_type=='pdf'){ //if content is pdf then also upload thumbnail
              if(scope.selectedThumbnail){
                GlobalService.proxyUpload('contents/'+data.asset.assetable_id+'/thumbnail?path='+path+'&auth_token='+getToken(),
                  'POST',
                  {},
                  scope.selectedThumbnail
                )
                .success(function(){
                  deferred.resolve();
                })
                .error(function(){
                  hideLoadingMask();
                  deferred.reject();
                });
              }
              else{
                deferred.resolve();
              }
            }
            else{
              proxyRequest(
                'contents/'+data.asset.assetable_id+'/thumbnail?path='+path+'&auth_token='+getToken(),
                'POST'
              ).success(function(){ deferred.resolve();});
            }
            //Clean up this code later
            deferred.promise.then(function(){
              scope.browse();
              //alert('Uploaded file successfully');
              hideLoadingMask();
              $('#reuploadContentModal').modal('hide');
            });
          })
          .error(function(){
            hideLoadingMask();
            GlobalService.showSimpleDialog('Cannot reupload file. Please try again.');
          });
        },

      showAddPresentationDialog: function(scope){
        scope.addPresentationName = '';
        scope.addPresentationDescription = '';
        $('#addPresentationModal').modal('show');
      },

      showPresentationOptionsDialog: function(){
        $('#presentationOptionsModal').modal('show');

      },

      startPresentation: PresentationService.startPresentation,
      startSlide: PresentationService.startSlide,
      previousSlide: PresentationService.previousSlide,
      nextSlide: PresentationService.nextSlide,
      endSlide: PresentationService.endSlide,
      getSlideImageSource: PresentationService.getSlideImageSource,
      getSlideThumbnailSource: PresentationService.getSlideThumbnailSource,

      sharePresentation: function(scope){
        showLoadingMask();
        proxyRequest(
          'presentations/'+scope.selectedAssetId+'/share?auth_token='+getToken(),
          'PUT'
        )
        .success(function(data,status){
          hideLoadingMask();
          // if(data.error_type=='already_shared'){
          //   GlobalService.showSimpleDialog('This presentation is already shared');
          // }
          $('#presentationOptionsModal').modal('hide');
          scope.browse();
        })
        .error(function(){
          hideLoadingMask();
        });
      },

      unsharePresentation: function(scope){
        showLoadingMask();
        proxyRequest(
          'presentations/'+scope.selectedAssetId+'/unshare?auth_token='+getToken(),
          'PUT'
        )
        .success(function(data,status){
          hideLoadingMask();
          $('#presentationOptionsModal').modal('hide');
          scope.browse();
        })
        .error(function(){
          hideLoadingMask();
        });
      },

      goToPresentationEditor: function(scope, token){
        $('.modal-backdrop').remove();
        $location.path('presentations/'+scope.selectedAssetId+'/edit');
  		},

      downloadPresentationPdf: function(scope){
        PdfService.downloadPresentationPdf(scope.selectedAssetId);
      },

      showEmailPresentationDialog: function(scope){
        $('#presentationOptionsModal').modal('hide');
        $('#emailPresentationModal').modal('show');
      },

      emailPresentationPdf: function(scope){
        PdfService.emailPresentationPdf(scope.selectedAssetId, scope.presentationEmail);
      },

      //UPLOAD
    	showAddContentDialog: function(scope){
        scope.onChooseImage();

    		$('#addContentModal').modal('show');
      },

      onChooseImage: function(scope){
        scope.uploadPdfWithThumbnail = false;
        scope.selectedThumbnail = null;
        scope.selectedFile = null;
        $('.file-upload-browser input[type=file]').val(null);
        scope.fileName = '';
        scope.thumbnailName = '';
        scope.fileType = 'image';
      },

      onChoosePdf: function(scope){
        scope.uploadPdfWithThumbnail = true;
        scope.selectedThumbnail = null;
        scope.selectedFile = null;
        $('.file-upload-browser input[type=file]').val(null);
        scope.fileName = '';
        scope.thumbnailName = '';
        scope.fileType = 'pdf';
      },

      onFileSelect: function(scope, files){
        if(files.length>0){
          if(scope.uploadPdfWithThumbnail){ //isPdf
            if(files[0].size>GeneralConfigService.maxPdfSizeBytes){
              GlobalService.showSimpleDialog('PDF size cannot exceed '+GeneralConfigService.maxPdfSizeText);
              return;
            }
            if(!files[0].type.match(/pdf/)){
               GlobalService.showSimpleDialog('Please select PDF file');
              return;
            }
          }
          else{ //isImage
            if(files[0].size>GeneralConfigService.maxImageSizeBytes){
              GlobalService.showSimpleDialog('Image size cannot exceed '+GeneralConfigService.maxImageSizeText);
              return;
            }
            if(!files[0].type.match(/png|jpeg/)){
              GlobalService.showSimpleDialog('Please select PNG or JPG file');
              return;
            }
          }

      		scope.selectedFile = files[0];
      		scope.progress[0] = -1;
          scope.fileName = files[0].name;
        }
      },

      onThumbnailSelect: function(scope, files){
        if(files.length>0){
           if(files[0].size>GeneralConfigService.maxThumbnailSizeBytes){
            GlobalService.showSimpleDialog('Thumbnail size cannot exceed '+GeneralConfigService.maxThumbnailSizeText);
            return;
          }
          if(!files[0].type.match(/png|jpeg/)){
            GlobalService.showSimpleDialog('Please select PNG or JPG file');
            return;
          }
          scope.selectedThumbnail = files[0];
          // scope.progress[1] = -1;
          scope.thumbnailName = files[0].name;
        }
    	},


    	addContent: function(scope, token, path){
        if(!scope.selectedFile){
          GlobalService.showSimpleDialog('Please select file to upload');
          return;
        }

        showLoadingMask(0, true);
        GlobalService.proxyUpload('contents/?path='+path+'&auth_token='+getToken(),
          'POST',
          {
            name: scope.addContentName,
            send_notification: scope.sendNotification,
            file_type: scope.fileType
          },
          scope.selectedFile
        ).success(function(data, status, headers, config) {
            // file is uploaded successfully but hold on..... its the thumbnail
            if(data.error_message){
              hideLoadingMask();
              GlobalService.showSimpleDialog(data.error_message);
              return;
            }

            //do promise here
            var deferred = $q.defer();

            if(data.content_type=='pdf'){ //if pdf also upload thumbnail
              GlobalService.proxyUpload('contents/'+data.assetable_id+'/thumbnail?path='+path+'&auth_token='+getToken(),
                'POST',
                {},
                scope.selectedThumbnail
              )
              .success(function(){
                deferred.resolve();
              })
              .error(function(){
                hideLoadingMask();
                deferred.reject();
              });
            }
            else{
              proxyRequest(
                // request to generate thumbnail
                'contents/'+data.assetable_id+'/thumbnail?path='+path+'&auth_token='+getToken(),
                'POST'
              ).success(function(){deferred.resolve();});
            }

            deferred.promise.then(function(){
              scope.browse();

              scope.addContentName = '';
              scope.selectedFile = [];
              scope.fileName = '';
              scope.thumbnailName = '';
              $('.file-upload-browser input[type=file]').val(null);

              $('[name=formAddContent]')[0].reset();

              hideLoadingMask();
              $('#addContentModal').modal('hide');
            });
          })
          .error(function(){
            hideLoadingMask();
          });
        },

      //FAVORITES
  		addToFavorites: function(scope, token){
        showLoadingMask();
        proxyRequest(
        	'favorites?auth_token='+getToken(),
        	'POST',
  	      {
  	      	asset_id: scope.selectedAssetId
  	      }
  	     )
        .success(function(data, status){
          if(data.id){
            scope.selectedAssetFavoriteId = data.id;
            scope.selectedAssetIsFavorited = true;
            for(var i=0; i<scope.folderData.assets.length; i++){
              if(scope.folderData.assets[i].id==scope.selectedAssetId){
                scope.folderData.assets[i].isFavorited = true;
                scope.folderData.assets[i].favoriteId = data.id;
                break;
              }
            }
          }
          hideLoadingMask();
          $('#contentOptionsModal').modal('hide');

          if(window.useLocalStorage){
            FileSyncService.syncFavorites();
          }

          //scope.browse();
        })
        .error(function(){
          hideLoadingMask();
        });
      },

      removeFromFavorites: function(scope, token){
        showLoadingMask();
        proxyRequest(
          'favorites/'+scope.selectedAssetFavoriteId+'?auth_token='+getToken(),
          'DELETE'
        )
        .success(function(data, status){
          if(data.id){
            scope.selectedAssetFavoriteId = null;
            for(var i=0; i<scope.folderData.assets.length; i++){
              if(scope.folderData.assets[i].id == data.favorite_asset_id){
                scope.folderData.assets.splice(i,1);
                scope.thumbnailSource.splice(i,1);
                $('#showImageModal').modal('hide');
                break;
              }
              else if(scope.folderData.assets[i].id==scope.selectedAssetId){
                scope.folderData.assets[i].isFavorited = false;
                scope.folderData.assets[i].favoriteId = undefined;
                scope.selectedAssetIsFavorited = false;
                break;
              }
            }
          }
          hideLoadingMask();
          $('#contentOptionsModal').modal('hide');
          if(data.error_type=='used_by_presentation_slide'){
            GlobalService.showSimpleDialog('This file is being used in your presentations and need to be in favorites.');
            return;
          }
          if(window.useLocalStorage){
            FileSyncService.syncFavorites();
          }
        })
        .error(function(){
          scope.browse();
          hideLoadingMask();
      		$('#contentOptionsModal').modal('hide');

        });
      }

    };


  });
