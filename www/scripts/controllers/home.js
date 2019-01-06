'use strict';

angular.module('searaClientApp')
  .controller('HomeCtrl', function ($scope, $rootScope, AuthService, $location, GlobalService, FolderService) {

  $scope.notifications = [];
  $scope.category = null;
  $scope.inNotification = true;

  $scope.refresh = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'notifications?'+($scope.category? 'category='+$scope.category+'&': '')+'auth_token='+AuthService.authToken,
      'GET'
    )
    .success(function (data, status){
      data.notifications.forEach(function(notification){
        notification.formatted_published_date = GlobalService.formatDate(notification.published_at);
        var asset_id;
        if(notification.item_id){
          if(notification.category=='cloud'){
            asset_id = notification.item_id;
          }
          else if(notification.asset_id){
            asset_id = notification.asset_id;
          }
        }
        if(asset_id){
          notification.thumbnailUrl = FolderService.getThumbnailSource(asset_id);
        }

      })
      $scope.notifications = data.notifications;
      GlobalService.hideLoadingMask();
    })
    .error(function(){
      if(status==401) return;
      if(!$rootScope.isOnline){
        GlobalService.showSimpleDialog('No connection');
      }
      else{
        GlobalService.showSimpleDialog('Cannot connect to the server');
      }
      GlobalService.hideLoadingMask();
    });
  }

  $scope.selectCategory = function(category){
    $('.header-buttons .active').removeClass('active');
    $('.header-buttons .'+category).addClass('active');

    $scope.category = category;
    $scope.refresh();
  }

  $scope.showContent = function(notification){
    if(notification.item_id){
      if(notification.category=='cloud'){
        if(notification.asset_type && notification.asset_type=='Presentation'){
          $location.path('/cloud/index/root/Seara%20Cloud/SHARED%20PRESENTATIONS');
        }
        else{
          FolderService.showImage($scope, {id: notification.item_id}, AuthService.auth_token);
        }
      }
      else if(notification.category=='training'){
        $location.path('/trainings');
      }
      else if(notification.category=='news'){
        $location.path('/news');
      }
      else if(notification.category=='epub'){
        $location.path('/epublications/'+notification.epub_category)
      }
    }
    else{
      if(notification.category=='message'){
        GlobalService.showSimpleDialog(notification.creator? notification.creator.name : '', notification.description);
      }
      else{
        GlobalService.showSimpleDialog('Content related to this notification has been deleted');
      }
    }
  }

  $scope.hideImage = function(){
    FolderService.hideImage($scope);
  }

  $scope.refresh();

});