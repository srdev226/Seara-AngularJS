'use strict';

function articleCtrl($scope, $rootScope, FolderService, AuthService, GlobalService, GeneralConfigService, $interval) {
  
  var token = AuthService.authToken;
  var userId = AuthService.currentUser.user_id;
  var groupId = AuthService.currentUser.group_id;
  var apiUrl = GlobalService.apiUrl;
  var proxyRequest = GlobalService.proxyRequest;

  var promise;
  var randomNumber;

  var addButtonAlignInterval;

  $scope.maxImageSizeText = GeneralConfigService.maxImageSizeText;
  $scope.maxThumbnailSizeText = GeneralConfigService.maxThumbnailSizeText;
  $scope.maxPdfSizeText = GeneralConfigService.maxPdfSizeText;

  $scope.fixAddButtonAlignment = function(){
    // $interval.cancel(addButtonAlignInterval);
    // addButtonAlignInterval= $interval(function(){
    var detailW = $('.article-detail').width();
    var viewW = $('.articles-view').outerWidth();
    $('.add-article-button').css('width', viewW-detailW +'px');
    // },100);
  }

  $scope.showSearchArticleDialog = function(){
    $('#searchArticleModal').modal('show');
  }
  
  $scope.searchArticle = function(){
    $('input').blur();

    $scope.searchText = $scope.articleSearchText;
    $('.search-bar').removeClass('hide');
    $('.articles-view').height('100%');
    $('.articles-view').height($('.articles-view').height()-$('.search-bar').height());
  }
  
  $scope.clearSearch = function(){
    $scope.searchText='';
    $scope.articleSearchText = '';
    $('.search-bar').addClass('hide');
    $('.articles-view').height('100%');
  }

  $scope.showPdf = function(assetId){
    FolderService.showPdf($scope, assetId, token);
  }

  $scope.getThumbnailSource = function(assetId){
    return FolderService.getThumbnailSource(assetId, randomNumber);
  }

  $scope.articleMouseDown = function(article, index, $event){
    $scope.selectedArticleIndex = index;
    $scope.selectedArticleId = article.id;
    var tempSelectedArticle = JSON.parse(JSON.stringify(article));
    tempSelectedArticle.published_date = new Date(tempSelectedArticle.published_date);
    $scope.selectedArticle = tempSelectedArticle;

    $scope.holdingTimeSec = 1;
    //want to just use millisec but too slow from too much overhead
    $scope.holdingTime = $scope.holdingTimeSec*10;

    $interval.cancel(promise);
    promise = $interval(function () {
      $scope.holdingTime -= 1;
      if($scope.holdingTime<=5){
        $scope.selectedArticleIndexForShaking = index; // shake if in article grid
      }
      if($scope.holdingTime<=0){
      $scope.selectedArticleIndex = -1; // stop shaking
      $scope.selectedArticleIndexForShaking = -1;
      $scope.showArticleOptionsDialog();
      $interval.cancel(promise);
      }
    }, 100); //T
  }

  $scope.articleMouseUp = function (article) {
    $scope.selectedArticleIndex = -1;
    $scope.selectedArticleIndexForShaking = -1;

    if($scope.holdingTime>0){
      $scope.showPdf(article.asset_id);
    }
    $interval.cancel(promise);
  }

  $scope.articleMouseMove = function (){
    $scope.selectedArticleIndex = -1;
    $scope.selectedArticleIndexForShaking = -1;
    
    $scope.holdingTime=0;
    $interval.cancel(promise);
  }

  $scope.showArticleOptionsDialog = function(){
    console.log($scope.canEdit);
    if($scope.canEdit){
      $('#articleOptionsModal').modal('show');
    }
  };

  $scope.showConfirmDeleteArticleDialog = function(){
    $('#articleOptionsModal').modal('hide');
    $('#confirmDeleteArticleModal').modal('show');
  }

  $scope.showAddArticleDialog = function(){
    $scope.newArticle = {};
    $('#addArticleModal').modal('show');
  }

  $scope.showEditArticleDialog = function(){
    $('#articleOptionsModal').modal('hide');
    $('#editArticleModal').modal('show');
  }

  $scope.showReuploadArticleThumbnailDialog = function(){
    $scope.thumbnailName = '';
    $scope.selectedThumbnail = null;
    $('.file-upload-browser input[type=file]').val(null);
    $('#articleOptionsModal').modal('hide');
    $('#reuploadArticleThumbnailModal').modal('show');
  }

  $scope.onThumbnailSelect = function(files){
    if(files.length>0){
      if(!files[0].type.match(/png|jpeg/)){
        GlobalService.showSimpleDialog('Please select PNG or JPG file');
        return;
      }
      if(files[0].size>GeneralConfigService.maxThumbnailSizeBytes){
        GlobalService.showSimpleDialog('Thumbnail size cannot exceed '+GeneralConfigService.maxThumbnailSizeText);
        return;
      }
      $scope.selectedThumbnail = files[0];
      $scope.thumbnailName = files[0].name;
    }
  }

  $scope.onPdfSelect = function(files){
    if(files.length>0){
      if(!files[0].type.match(/pdf/)){
        GlobalService.showSimpleDialog('Please select PDF file');
        return;
      }
      if(files[0].size>GeneralConfigService.maxPdfSizeBytes){
        GlobalService.showSimpleDialog('PDF size cannot exceed '+GeneralConfigService.maxPdfSizeText);
        return;
      }
      $scope.selectedPdf = files[0];
      $scope.pdfName = files[0].name;
    }
  }

  $scope.clearFile = function(){
    $scope.selectedThumbnail = null;
    $scope.thumbnailName = '';
    $scope.selectedPdf = null;
    $scope.pdfName = '';
    $('.file-upload-browser input[type=file]').val(null);
  }
}