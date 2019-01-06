'use strict';

angular.module('searaClientApp')
	.factory('ConnectionService', function($http, $q, ServerConfigService, $rootScope, DialogService, $timeout, $interval, FileSyncService, AuthService){

  var states = {};
  var keepPolling = true;

  var checkConnection = function(){
    if(window.isTablet && (typeof Connection !== 'undefined')){
      states[Connection.UNKNOWN]  = 'Unknown connection';
      states[Connection.ETHERNET] = 'Ethernet connection';
      states[Connection.WIFI]     = 'WiFi connection';
      states[Connection.CELL_2G]  = 'Cell 2G connection';
      states[Connection.CELL_3G]  = 'Cell 3G connection';
      states[Connection.CELL_4G]  = 'Cell 4G connection';
      states[Connection.CELL]     = 'Cell generic connection';
      states[Connection.NONE]     = 'No network connection';

      if(navigator.connection.type==Connection.NONE){
        if($rootScope.isOnline){
          console.log('online -> offline');
        }
        $rootScope.isOnline = false;
      }
      else{
        if(!$rootScope.isOnline){
          console.log('offline -> online');
          if(AuthService.authToken!=undefined && window.useLocalStorage){
            console.log('auth token exists: start sync favorites');
            FileSyncService.syncFavorites();
          }
          $rootScope.isOnline =true;
        }
      }
    }        
    else{
      if(!navigator.onLine){
        if($rootScope.isOnline){
          console.log('online -> offline');
        }
        $rootScope.isOnline = false;
      }
      else{
        if(!$rootScope.isOnline){
          console.log('offline -> online');
          if(AuthService.authToken!=undefined && window.useLocalStorage){
            console.log('auth token exists, start sync favorites');
            FileSyncService.syncFavorites();
          }
          $rootScope.isOnline =true;
        }
      }        
    }
  }
    
  var pollInterval = null;
  var pollConnection = function(){
    if(pollInterval){
      $interval.cancel(pollInterval);
    }
    pollInterval = $interval(function(){
      if(keepPolling) checkConnection();
    }, 1000);
  }
  pollConnection();

  var notifyOffline = function(){
    var wasOnline = $rootScope.isOnline;
    return $interval(function(){
      if(wasOnline && !$rootScope.isOnline){
        wasOnline = false;
        DialogService.showSimpleDialog('No network connection');
      }
      else if($rootScope.isOnline){
        wasOnline=true;
      }
    },1000); 
  }

  $rootScope.forceOnlineStatus = function(status){
    keepPolling = status;
    $rootScope.isOnline = status;
  }

  return {
    notifyOffline: notifyOffline,
    checkConnection: checkConnection
  }

});
