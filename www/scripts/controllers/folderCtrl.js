'use strict';

function folderCtrl ($modal, $interval, path, GlobalService, GeneralConfigService, FolderService, AuthService, $rootScope,
    $upload, $scope, $routeParams, $location, $http, menu) {

    //got path from resolve
    $scope.folderData = [];
    $scope.inFavorites = false; // if false, can add new file and add to favorites

    var token = AuthService.authToken;
    var userId = AuthService.currentUser.user_id;
    var groupId = AuthService.currentUser.group_id;
    var apiUrl = GlobalService.apiUrl;

    var promise; //for press and hold timing

    // $rootScope.titleName = '';
    $scope.prefixPath = '';

    $scope.selectedFolderIconIndex = -1; //for shaking icons
    $scope.selectedAssetIconIndex = -1; //for shaking icons

  	$scope.progress = new Array(2);
    $scope.fileType = 'image';

    $scope.selectedFolderIconIndex = -1; //for shaking icons
    $scope.selectedAssetIconIndex = -1; //for shaking icons

    $scope.maxImageSizeText = GeneralConfigService.maxImageSizeText;
    $scope.maxThumbnailSizeText = GeneralConfigService.maxThumbnailSizeText;
    $scope.maxPdfSizeText = GeneralConfigService.maxPdfSizeText;

    $scope.browse = function(){
        FolderService.browse($scope, path, token, userId, groupId, menu);
    };

    $scope.showPdf = function(assetId){
      FolderService.showPdf($scope, assetId, token);
    }

    $scope.showImage = function(asset){
      FolderService.showImage($scope, asset, token);
    }

    $scope.previousImage = function(asset){
      FolderService.previousImage($scope, token);
    }

    $scope.nextImage = function(asset){
      FolderService.nextImage($scope, token);
    }

    $scope.hideImage = function(){
      FolderService.hideImage($scope);
    }

    $scope.getThumbnailSource = function(assetId){
      return FolderService.getThumbnailSource(assetId, token);
    }

    $scope.folderMouseDown = function(folder, $index, $event){
        FolderService.folderMouseDown($scope, folder, $index, $interval);
    };

    $scope.folderMouseUp = function (folderPath, $event) {
      FolderService.folderMouseUp($scope, folderPath, $location, $interval);
    };

    $scope.folderMouseMove = function (){
      FolderService.folderMouseMove($scope, $interval);
    };

    $scope.showSearchFolderDialog = function(){
      $('#searchFolderModal').modal('show');
    };

    $scope.searchFolder = function(){
      FolderService.searchFolder($scope, token, userId, groupId, menu);
    };

    $scope.clearSearch = function(){
      FolderService.clearSearch($scope);
    }

    $scope.showAddFolderDialog = function(){
      FolderService.showAddFolderDialog($scope);
    };

    $scope.addFolder = function(){
      FolderService.addFolder($scope, path, token);
    };

    $scope.showFolderOptionsDialog = function(){
      if($scope.canEdit){
        FolderService.showFolderOptionsDialog();
      }
    };

    $scope.showConfirmDeleteFolderDialog = function(){
      FolderService.showConfirmDeleteFolderDialog();
    };

    $scope.deleteFolder = function(){
      FolderService.deleteFolder($scope, token);
    }

    $scope.showEditFolderDialog = function(){
      FolderService.showEditFolderDialog();
    }

    $scope.editFolder = function(){
      FolderService.editFolder($scope, token);
    }

    //asset
    $scope.assetMouseDown = function(asset, $index, $event){
      FolderService.assetMouseDown($scope, asset, $index, $interval);
    };

    $scope.assetMouseUp = function (asset, $event) {
      FolderService.assetMouseUp($scope, asset, $interval);
    };

    $scope.assetMouseMove = function (){
      FolderService.assetMouseMove($scope, $interval);
    };

    $scope.showContentOptionsDialog = function(){
        FolderService.showContentOptionsDialog();
    };

    $scope.showConfirmDeleteAssetDialog = function(){
      FolderService.showConfirmDeleteAssetDialog();
    }

    $scope.deleteAsset = function(){
      FolderService.deleteAsset($scope, token);
    }

    $scope.showEditContentDialog = function(){
      FolderService.showEditContentDialog();
    }

    $scope.showFolderBrowserDialog = function(){
      FolderService.showFolderBrowserDialog();
    }

    $scope.showReuploadContentDialog = function(){
      FolderService.showReuploadContentDialog($scope);
    }

    $scope.showEditPresentationDialog = function(){
      FolderService.showEditPresentationDialog();
    }

    $scope.editAsset = function(){
      FolderService.editAsset($scope, token);
    }

    $scope.moveAsset = function(){
      FolderService.moveAsset($scope, token);
    }

    $scope.reuploadAsset = function(){
      FolderService.reuploadAsset($scope, token, path);
    }

    $scope.editPresentation = function(){
      FolderService.editPresentation($scope, token);
    }

    $scope.goToPresentationEditor = function(){
      FolderService.goToPresentationEditor($scope, token);
    }

    $scope.downloadPresentationPdf = function(){
      FolderService.downloadPresentationPdf($scope);
    }

    $scope.showEmailPresentationDialog = function(){
      FolderService.showEmailPresentationDialog($scope);
    }

    $scope.emailPresentationPdf = function(){
      FolderService.emailPresentationPdf($scope);
    }

    //UPLOAD
    $scope.showAddContentDialog = function(){
      $scope.addContentName = '';
      $('#addContentModal').modal('show');
    };


    $scope.onChooseImage = function(){
      FolderService.onChooseImage($scope);
    }

    $scope.onChoosePdf = function(){
      FolderService.onChoosePdf($scope);
    }

    $scope.onFileSelect = function($files){
      FolderService.onFileSelect($scope, $files);
    }
    $scope.onThumbnailSelect = function($files){
      FolderService.onThumbnailSelect($scope, $files);
  	}
  	$scope.addContent = function(){
      //console.log(JSON.stringify($scope.selectedFile));
      //console.log(JSON.stringify($scope.selectedThumbnail));

      FolderService.addContent($scope, token, path);

  	  //$scope.upload = $upload.upload({url: apiUrl+'/contents/?path='+path+'&auth_token='+token, method: 'POST', data:{name: $scope.addContentName, file_type: $scope.fileType }, file: $scope.selectedFile }) //STILL NOT WORKING CORRECTLY .progress(function(evt) {// console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total)); }).success(function(data, status, headers, config) {// file is uploaded successfully but hold on..... its the thumbnail if(data.content_type=='pdf'){ //if pdf also upload thumbnail $upload.upload({url: apiUrl+'/contents/'+data.assetable_id+'/thumbnail?path='+path+'&auth_token='+token, method: 'POST', file: $scope.selectedThumbnail }) .progress(function(evt) {//console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total)); }).success(function(data, status, headers, config) {}).error(function(){//alert('Error uploading file.'); return; }); } else if(data.content_type=='image'){$http.post(apiUrl+'/contents/'+data.assetable_id+'/thumbnail?path='+path+'&auth_token='+token) .success(function(data, status, headers, config) {}).error(function(){//alert('Error uploading file.'); return; }); } $scope.browse(); alert('Uploaded file successfully'); $('#addContentModal').modal('hide'); });
    }

  $scope.addToFavorites = function(){
    FolderService.addToFavorites($scope, token);
  }

  $scope.removeFromFavorites = function(){
    FolderService.removeFromFavorites($scope, token);
  }

  $scope.showAddPresentationDialog = function(){
    FolderService.showAddPresentationDialog($scope);
  }

  $scope.showPresentationOptionsDialog = function(){
    if($scope.canEdit){
    FolderService.showPresentationOptionsDialog();
    }
  }

  $scope.sharePresentation = function(){
    FolderService.sharePresentation($scope);
  }

  $scope.unsharePresentation = function(){
    FolderService.unsharePresentation($scope);
  }

  $scope.addPresentation = function(){
    FolderService.addPresentation($scope);
  }

  $scope.startPresentation = function(assetId){
    FolderService.startPresentation($scope, assetId);
  }

  $scope.showPresentationViewer = function(){
    FolderService.showPresentationViewer();
  }
  $scope.hidePresentationViewer = function(){
    FolderService.hidePresentationViewer();
  }

  $scope.startSlide = function(){
    FolderService.startSlide($scope);
  }

  // $scope.previousSlide = function(){}
  $scope.nextSlide = function(){
    FolderService.nextSlide($scope);
  }

  $scope.previousSlide = function(){
    FolderService.previousSlide($scope);
  }

  $scope.endSlide = function(){
    FolderService.endSlide($scope);
  }

  $scope.getSlideImageSource = function(presentationSlideId){
    return FolderService.getSlideImageSource(presentationSlideId);
  }
}