'use strict';

angular.module('searaClientApp')
	.factory('AuthService', function (GlobalService, $http, $rootScope, $q, $location, localStorageService) {
		
		var currentUser = {};
    var authToken;

		var proxyRequest = GlobalService.proxyRequest;
    
    var lockUpdateCurrentUser = false;
    var updateUserDeferred;
    var updateCurrentUser = function(data){
      if(lockUpdateCurrentUser) return updateUserDeferred.promise;

      updateUserDeferred = $q.defer();
      lockUpdateCurrentUser = true;

      var deferred = $q.defer();
      var currentUser = localStorageService.get('currentUser');
      var authToken = localStorageService.get('authToken');

      if(!data){
        if($rootScope.isOnline){
          console.log('updating account data');
          proxyRequest('sessions/info?auth_token='+authToken,
          'GET')
          .success(function(data, status){
            if(!data.user_id){
              deferred.reject();
              return;
            }
            console.log('update account data done');
            deferred.resolve(data);
          })
          .error(function(){
            console.log('update account data failed');
            deferred.reject('update account data failed');
          });
        }
        else{
          deferred.reject();
        }
      }
      else{
        deferred.resolve(data);
      }
      deferred.promise.then(
        function (data) {
          currentUser = currentUser || {};
          currentUser.user_id = data.user_id;
          currentUser.first_name = data.first_name;
          currentUser.last_name = data.last_name;
          currentUser.group_id = data.group_id;
          localStorageService.set('currentUser', currentUser);
          $rootScope.currentUserName = [currentUser.first_name, currentUser.last_name].join(' ');
          updateUserDeferred.resolve(currentUser);
          lockUpdateCurrentUser = false;
        },
        function (message) {
          updateUserDeferred.resolve(currentUser);
          lockUpdateCurrentUser = false;
        }
      );

      return updateUserDeferred.promise;
    }

		return {
			currentUser: currentUser,
      authToken: authToken,
      updateCurrentUser: updateCurrentUser,
			
			login: function(email, password){
				return proxyRequest(
					'sessions/login/', 
					'POST',
					{
						'email': email,
						'password': password
					}
				);
			},

      logout: function(){
        return proxyRequest(
          'sessions/logout?auth_token='+ localStorageService.get('authToken'),
          'DELETE'
          );
      },

      auth: function() {
        var deferred = $q.defer(); 

        if(!localStorageService.get('authToken')){
          deferred.reject();
          $location.path('/login');
        }
        else{
          $rootScope.showMenu = true;
          deferred.resolve();
          var that = this;
          updateCurrentUser().then(
            function () {
              that.loadCurrentUser();
              GlobalService.setSPosition();
              deferred.resolve();
            },
            function () {
              that.loadCurrentUser();              
              GlobalService.setSPosition();
              deferred.resolve();
            }
          );
        }
        return deferred.promise;
      },

      loadCurrentUser: function(){
        var localCurrentUser = localStorageService.get('currentUser');
        var localAuthToken = localStorageService.get('authToken');
        if(!localCurrentUser || !localAuthToken) return false;

        this.currentUser = localCurrentUser;
        this.authToken = localAuthToken;

        if(window.useLocalStorage){
          var localPresentationsFolder = localStorageService.get(this.currentUser.user_id+'_localPresentationsFolder');
          if(!localPresentationsFolder){
            console.log('create blank '+this.currentUser.user_id+'_localPresentationsFolder');
            localPresentationsFolder = {'currentFolder':{}, 'folders': [], 'assets': [], 'favorites': []};
            localStorageService.set(this.currentUser.user_id+'_localPresentationsFolder', localPresentationsFolder);
          }
          var localFavoritesFolder = localStorageService.get(this.currentUser.user_id+'_localFavoritesFolder');
          if(!localFavoritesFolder){
            console.log('create blank '+this.currentUser.user_id+'_localFavoritesFolder');
            localFavoritesFolder = {'assets': [], 'folders': [], 'favorites': []};
            localStorageService.set(this.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);
          }
        }

        // permissions
        $rootScope.isSuper = this.currentUser.group_id == 0;
        $rootScope.isAdmin = this.currentUser.group_id == 1;
        $rootScope.showManagement = $rootScope.isSuper || $rootScope.isAdmin;
        $rootScope.canEditCloud = $rootScope.isSuper || $rootScope.isAdmin;
        $rootScope.canEditNews = $rootScope.isSuper || $rootScope.isAdmin;
        $rootScope.canEditTrainings = $rootScope.isSuper || $rootScope.isAdmin;
        $rootScope.canEditEPublications = $rootScope.isSuper || $rootScope.isAdmin;
        $rootScope.canEditUsers = $rootScope.isSuper || $rootScope.isAdmin;

        $rootScope.currentUserName = [this.currentUser.first_name, this.currentUser.last_name].join(' ');

        return true;
      },

      redirectIfLoggedIn: function(){
      	var deferred = $q.defer();

      	if(localStorageService.get('authToken')){
        	deferred.reject();
          $location.path('/');
        }
        else{
        	deferred.resolve();
        }

        return deferred.promise;

      },

      redirectIfNotLoggedIn: function(){
      	var deferred = $q.defer();

      	if(localStorageService.get('authToken')){
        	deferred.reject();
          $location.path('/');
        }
        else{
        	deferred.resolve();
        }

        return deferred.promise;

      }
		}
});
