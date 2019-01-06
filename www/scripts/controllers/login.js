'use strict';

angular.module('searaClientApp')
  .controller('LoginCtrl', ['$scope', '$routeParams', '$location', 'localStorageService', '$timeout', 'AuthService', 'GlobalService', 'PushNotificationsService', 'FileSyncService' ,
    function($scope, $routeParams, $location, localStorageService, $timeout, AuthService, GlobalService, PushNotificationsService, FileSyncService){

    $scope.login = function(){
      $( document.activeElement ).blur();
      GlobalService.showLoadingMask(0);
  
      AuthService.login($scope.email, $scope.password)
      .success(function(data, status){
        GlobalService.hideLoadingMask();
        if(data.error_type){

          $scope.invalidEmail = false;
          $scope.invalidPassword = false;
          $scope.notApproved = false;

          switch(data.error_type){
            case 'invalid_email_or_password':
              GlobalService.showSimpleDialog('Invalid username or password. Please try again.');
              break;
            default: //'not_approved'
              $scope.notApproved = true;
              GlobalService.showSimpleDialog('Account has not been approved. Please contact administrator.');
          }
          return;
        }
        var currentUser = {
          user_id: data.user_id,
          first_name: data.first_name,
          last_name: data.last_name,
          group_id: data.group_id
        }
        localStorageService.set('currentUser', currentUser);
        localStorageService.set('authToken', data.auth_token)
        AuthService.loadCurrentUser();

        if(window.useLocalStorage){
          FileSyncService.syncPresentationsAndFavorites();
        }

        if(window.isTablet){
          PushNotificationsService.pushRegister();
        }
        
        $location.path('/');
      })
				.error(function (){
	        GlobalService.hideLoadingMask();
	        GlobalService.showSimpleDialog('Cannot connect to the server');
	      });
	    }

    $scope.showForgotPasswordDialog = function(){
      $scope.userEmail = '';
      $('#forgotPasswordModal').modal('show');
    }

    $scope.sendResetEmail = function(){
      GlobalService.showLoadingMask(0);
      GlobalService.proxyRequest(
        'password',
        'POST',
        { email: $scope.userEmail}
      )
      .success(function(data){
        GlobalService.hideLoadingMask();
        if(data.error_type){
          switch(data.error_type){
            case 'email_not_exists':
              GlobalService.showSimpleDialog('This e-mail is invalid.');
              break;
            default:
              GlobalService.showSimpleDialog('Failed to send e-mail.');
          }
          return;
        }
        GlobalService.showSimpleDialog('Reset password e-mail successfully sent.');
        $('#forgotPasswordModal').modal('hide');
      });
    }
  }
]);
