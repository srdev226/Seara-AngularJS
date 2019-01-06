'use strict';

angular.module('searaClientApp')
 .controller('EPublicationsIndexCtrl',
  function( $routeParams, $filter, $scope, $rootScope, $timeout, $q, $location, GlobalService, 
            GeneralConfigService, FolderService, AuthService, $interval) {  
  
    articleCtrl.call(this, $scope, $rootScope, FolderService, AuthService, GlobalService, GeneralConfigService, $interval);

    $scope.category = $routeParams.category;

    if($scope.category=='brochures'){
      $scope.categorySingular = 'brochure';
    }
    else if($scope.category=='adverts'){
      $scope.categorySingular = 'advert';
    }
    else{
      $scope.categorySingular = $scope.category.substr(0, $scope.category.length-1);
    }

    $scope.canEdit = $rootScope.canEditEPublications;
    $rootScope.titleName = 'E-Publications';
    if($scope.category!==undefined){
      $rootScope.titleName = $scope.category;
    }
    $scope.articleType = 'E-Publication';
    $scope.articleTypeInDescription = 'e-publication';
    $scope.showDate = false;
    $scope.topLeftBackLink = 'epublications';

   var token = AuthService.authToken;
    var userId = AuthService.currentUser.user_id;
    var groupId = AuthService.currentUser.group_id;
    var apiUrl = GlobalService.apiUrl;

    var proxyRequest = GlobalService.proxyRequest;

    $scope.selectedArticleIndex = -1; //for shaking icons
    $scope.selectedArticleId = -1;
    $scope.selectedArticle = null;

    var promise;
    var randomNumber;

    $scope.searchArticle = function(){
      $scope.searchText = $scope.articleSearchText;
      $('.search-bar').removeClass('hide');
      $('.articles-grid-view').height('100%');
      $('.articles-grid-view').height($('.articles-grid-view').height()-$('.search-bar').height());
    }
    
    $scope.clearSearch = function(){
      $scope.searchText='';
      $scope.articleSearchText = '';
      $('.search-bar').addClass('hide');
      $('.articles-grid-view').height('100%');
    }

		$scope.listArticles = function(){
      if(!$rootScope.isOnline){
        if(window.useLocalFileSystem) {
          GlobalService.showSimpleDialog('No connection. Only Presentations and Favorites available.');
        }
        else {
          GlobalService.showSimpleDialog('No connection. Please try again.');
        }
        return;
      }
      GlobalService.showLoadingMask();
			proxyRequest(
				'e_publications/?category='+$scope.category+'&auth_token='+token,
				'GET')
			.success(function(data, status){
        $scope.articles = data.e_publications;

        // var str = '';
        // for(var i=0; i<50; i++){
        //   str+=',{"id":3,"title":"","description":"YEAH YEAH YEAH.....","asset_id":370,"creator_id":1,"deleted_at":null,"created_at":"2014-11-03T11:25:35.000+07:00","updated_at":"2014-11-03T11:25:35.000+07:00","asset_name":"2014_11_03_1414988735_Seara Flooring Brochure.pdf"}';
        // }
        // $scope.articles = JSON.parse("["+str.substring(1)+"]");
        randomNumber = Math.random();
        $scope.articles.forEach(function(article){
          article.thumbnailSource = $scope.getThumbnailSource(article.asset_id);
        });
        GlobalService.hideLoadingMask();
			})
			.error(function(data, status){
        GlobalService.hideLoadingMask();
        if(status==401) return;
        GlobalService.showSimpleDialog('Cannot connect to the server');
			});
		}

    // $scope.hideImage = function(){
    //   FolderService.hideImage($scope);
    // }

    $scope.showArticleOptionsDialog = function(){
      if($scope.canEdit){
        $('#articleOptionsModal').modal('show');
      }
    };

    $scope.showConfirmDeleteArticleDialog = function(){
      $('#articleOptionsModal').modal('hide');
			$('#confirmDeleteArticleModal').modal('show');
    }

    $scope.showAddArticleDialog = function(){
      $scope.newArticle = {
        published_date: new Date()
      };

      $('#addArticleModal').modal('show');
    }

    $scope.deleteArticle = function(){  
      GlobalService.showLoadingMask();
      proxyRequest(
        'e_publications/'+$scope.selectedArticleId+'/?auth_token='+token,
        'DELETE'
      )
      .success(function(data, status){
        GlobalService.hideLoadingMask();
        if(data.errorType){
        	GlobalService.showSimpleDialog('Cannot delete E-Publication. Please try again.');
        	return;
        }
        $scope.listArticles();
        $('#confirmDeleteArticleModal').modal('hide');
      })
      .error(function(){
        GlobalService.hideLoadingMask();
      });
    }

        //   //var deferred = $q.defer();
        //   //$timeout(function(){deferred.resolve();}, 1000);
        //   // deferred.promise.then(function(){
        //   $('.modal-backdrop').remove();
        //   $location.path('/articles/'+$scope.selectedArticleId+'/edit');
        //   // });

        // }

    $scope.addArticle = function(){
      if(!$scope.selectedPdf || !$scope.selectedThumbnail){
        GlobalService.showSimpleDialog('Please select files to upload');
        return;
      }
      var waitForPdfUpload = $q.defer();

      GlobalService.showLoadingMask(0, true);
      GlobalService.proxyUpload('e_publications/?auth_token='+token,
        'POST',
        {
          description: $scope.newArticle.description || '',
          send_notification: $scope.sendNotification,
          category: $scope.category,
          published_date: $scope.newArticle.published_date,
        },
        $scope.selectedPdf
      )
      .success(function(data, status){
        if(data.error_message){
          GlobalService.hideLoadingMask();
          GlobalService.showSimpleDialog(data.error_message);
          return;
        }
        waitForPdfUpload.resolve(data.e_publication);
      })
      .error(function(){
        waitForPdfUpload.reject();
        GlobalService.hideLoadingMask();
      });

      waitForPdfUpload.promise.then(function(article){
        GlobalService.proxyUpload('e_publications/'+article.id+'/thumbnail/?auth_token='+token,
          'POST',
          {},
          $scope.selectedThumbnail
        )
        .success(function(data, status){
          if(data.error_message){
            GlobalService.hideLoadingMask();
            GlobalService.showSimpleDialog(data.error_message);
          }
          $scope.clearFile();
          $('#addArticleModal').modal('hide');
          $scope.listArticles();
          GlobalService.hideLoadingMask();
        })
        .error(function(){
          GlobalService.hideLoadingMask();
        });
      });
    }

    $scope.editArticle = function(){
      GlobalService.showLoadingMask();
      proxyRequest(
        'e_publications/'+$scope.selectedArticleId+'/?auth_token='+token,
        'PUT',
        $scope.selectedArticle
      )
      .success(function(data, status){
      	if(data.error_message){
        	GlobalService.showSimpleDialog(data.error_message);
        	return;
        }
        $('#editArticleModal').modal('hide');
        $scope.listArticles();
        GlobalService.hideLoadingMask();
      })
      .error(function(){
        GlobalService.hideLoadingMask();
      });
    }
    
    $scope.reuploadArticleThumbnail = function(){
      if(!$scope.selectedThumbnail){
        GlobalService.showSimpleDialog('Please select preview image');
        return;
      }
      GlobalService.showLoadingMask(0);
      GlobalService.proxyUpload('e_publications/'+$scope.selectedArticleId+'/thumbnail/?auth_token='+token,
        'POST',
        {},
        $scope.selectedThumbnail
      )
      .success(function(data, status){
        if(data.error_message){
          GlobalService.hideLoadingMask();
          GlobalService.showSimpleDialog(data.error_message);
          return;
        }
        $scope.clearFile();
        GlobalService.hideLoadingMask();
        $('#reuploadArticleThumbnailModal').modal('hide');
        $scope.listArticles();
      })
      .error(function(){
        GlobalService.hideLoadingMask();
      });
    }

    var titlebarRightButtons = [
      { functionToCall: "showSearchArticleDialog", args: '()', iconClass: 'search-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);
});
	
