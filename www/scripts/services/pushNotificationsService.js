'use strict';

angular.module('searaClientApp')
  .factory('PushNotificationsService', ['$ionicPush', '$ionicUser', '$location', '$rootScope', 'AuthService', 
  function ($ionicPush, $ionicUser, $location, $rootScope, AuthService) {

  // $rootScope.$on('$cordovaPush:tokenReceived', function(event, data) {
  //   alert("Successfully registered token " + data.token);
  //   console.log('Ionic Push: Got token ', data.token, data.platform);
  //   $scope.token = data.token;
  // });

  var config = {
    canShowAlert: true, //Can pushes show an alert on your screen?
    canSetBadge: true, //Can pushes update app icon badges?
    canPlaySound: true, //Can notifications play a sound?
    canRunActionsOnWake: true //Can run actions outside the app
  };

  var pushRegister = function () {
    if(AuthService.currentUser) {
      console.log(AuthService.currentUser);
    // if(window.plugins && window.plugins.pushNotification && AuthService.currentUser) {
      console.log('Ionic Push: Registering user');
      // Register with the Ionic Push service.  All parameters are optional.
          
      $ionicPush.register({
        canShowAlert: config.canShowAlert,
        canSetBadge: config.canSetBadge,
        canPlaySound: config.canPlaySound,
        canRunActionsOnWake: config.canRunActionsOnWake,
        onNotification: function (notification) {
          // Handle new push notifications here
          console.log('onNotification!');
          console.log(notification);          
          if(notification.foreground==='0'){
            if(notification.go_to_page==='notifications'){
              $location.path('/');
            }
          }
          return false;
        }
      },
      {
        user_id: ''+AuthService.currentUser.user_id
      });
      // registered = true;
    }
    else {
      // registered = true;
    }
  };

  return {
    pushRegister: pushRegister
  }

}]);
