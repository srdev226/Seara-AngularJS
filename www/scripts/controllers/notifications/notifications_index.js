'use strict';

angular.module('searaClientApp')
 .controller('NotificationsIndexCtrl',function($scope, $rootScope, $interval, GlobalService, AuthService) {  
  
  $scope.notifications = [];

  var refresh = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'notifications?manage=true&auth_token='+AuthService.authToken,
      'GET'
    )
    .success(function (data, status){
      data.notifications.forEach(function(notification){
        notification.formatted_published_date = GlobalService.formatDate(notification.published_at);
      });
      $scope.notifications = data.notifications;
      GlobalService.hideLoadingMask();
    })
    .error(function(data, status){
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

  refresh();

  // open dialog
  $scope.showNotificationOptionsDialog = function(){
    $('#notificationOptionsModal').modal('show');
  }

  $scope.showAddNotificationDialog = function(){
    $scope.newMessage = '';
    $('#addNotificationModal').modal('show');
  }

  $scope.showEditNotificationDialog = function(){
    $('#editNotificationModal').modal('show');
  }

  $scope.showConfirmDeleteNotificationDialog = function(){
    $('#confirmDeleteNotificationModal').modal('show');
  }

  // post to server
  $scope.addNotification = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'notifications?auth_token='+AuthService.authToken,
      'POST', {
        'description': $scope.newMessage
      }
    )
    .success(function (data, status){
      if(data.success==true){
        $('#addNotificationModal').modal('hide');
      }
      refresh();
      GlobalService.hideLoadingMask();
    })
    .error(function(){
      GlobalService.hideLoadingMask();
    });
  }

  $scope.editNotification = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'notifications/'+ $scope.selectedNotification.id +'?auth_token='+AuthService.authToken,
      'PUT', {
        'description': $scope.selectedNotification.description
      }
    )
    .success(function (data, status){
      if(data.success==true){
        $('#editNotificationModal').modal('hide');
      }
      refresh();
      GlobalService.hideLoadingMask();
    })
    .error(function(){
      GlobalService.hideLoadingMask();
    });  
  }

  $scope.deleteNotification = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'notifications/'+ $scope.selectedNotification.id +'?auth_token='+AuthService.authToken,
      'DELETE'
    )
    .success(function (data, status){
      if(data.success==true){
        $('#editNotificationModal').modal('hide');
      }
      refresh();
      GlobalService.hideLoadingMask();
    })
    .error(function(){
      GlobalService.hideLoadingMask();
    });  
  }

  // touch event
  var promise;
  $scope.notificationTouchBegin = function(notification, index){
    $scope.selectedNotificationIndex = index;
    $scope.selectedNotification = JSON.parse(JSON.stringify(notification));

    $scope.holdingTimeSec = 1;
    //want to just use millisec but too slow from too much overhead
    $scope.holdingTime = $scope.holdingTimeSec*10;
    $interval.cancel(promise);
    promise = $interval(function () {
      $scope.holdingTime -= 1;
      if($scope.holdingTime<=0){
        $interval.cancel(promise);
        $scope.showNotificationOptionsDialog();
        $('.selected').removeClass('selected');
      }
    }, 100);  
  }

  $scope.notificationTouchMove = function(){
    $scope.selectedNotificationIndex = -1;
    $scope.holdingTime = 0;
    $interval.cancel(promise);
  }

  $scope.notificationTouchEnd = function(){
    $scope.selectedNotificationIndex = -1;
    $('.selected').removeClass('selected');
    $interval.cancel(promise);
  }

  var titlebarRightButtons = [
    { functionToCall: "showAddNotificationDialog", args: '()', iconClass: 'add-notification', text: null }
  ];
  $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});
	
