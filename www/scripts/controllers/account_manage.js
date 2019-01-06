'use strict';

angular.module('searaClientApp')
	.controller('AccountManageCtrl', ['$q', 'FileSyncService', 'GlobalService', 'AuthService', '$rootScope', '$scope', 'localStorageService', '$routeParams', '$location', '$ionicUser', '$ionicPush',
	function ($q, FileSyncService, GlobalService, AuthService, $rootScope, $scope, localStorageService, $routeParams, $location, $ionicUser, $ionicPush) {

	var token = AuthService.authToken;
  var userId = AuthService.currentUser.user_id;
  var groupId = AuthService.currentUser.group_id;

  $scope.showSyncMenu = window.useLocalStorage;

  $scope.jsonLocalPresentationsFolder = JSON.stringify(localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder'));
  $scope.jsonLocalFavoritesFolder = JSON.stringify(localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder'));
  $scope.jsonLocalAssetToPresentation = JSON.stringify(localStorageService.get('localAssetToPresentation'));

	$scope.clearLocalFile = function(){
		FileSyncService.removeLocalFileList();
		console.log('clear local presentations and favorites data');
	}

	$scope.syncPresentationsAndFavorites = function(){
	if(window.useLocalStorage){
		if(!$rootScope.isOnline){
			GlobalService.showSimpleDialog('Cannot connect to the server');
			return;
		}
		GlobalService.showLoadingMask(0,true);

  		console.log('start sync');
  		FileSyncService.syncPresentationsAndFavorites().then(function(){
  			GlobalService.hideLoadingMask();
  			GlobalService.showSimpleDialog('Sync completed. Presentations and Favorites can be viewed locally.');
  		}, function(){
  		  GlobalService.hideLoadingMask();
  			GlobalService.showSimpleDialog('Sync not completed. Please try again.');
         
  		});
  	}
	}

	$scope.getAccountData = function(){
		return GlobalService.proxyRequest('users/'+AuthService.currentUser.user_id+'?auth_token='+token, 'GET');
	}
	
	$scope.showEditUserDialog = function(){
		$('#btnUpdate').addClass('selected');

		$scope.getAccountData().success(function(data, status){
			$scope.user = data.user;
			$scope.officeLocations = data.office_locations;
			$('#editUserModal').modal('show');
		})
		.error(function(){
			$('#btnUpdate').removeClass('selected');
		});
	}
	$('#editUserModal').on('hide.bs.modal', function(){
		$('#btnUpdate').removeClass('selected');
	});

	$scope.editUser = function(){
		GlobalService.showLoadingMask(0);
      GlobalService.proxyRequest('users/'+$scope.user.id+'?auth_token='+token,
       'PUT',
        $scope.user,
        true
      )
      .success(function(data){
        GlobalService.hideLoadingMask();
        if(data.error_message){
        	GlobalService.showSimpleDialog(data.error_message);
          return;
        }

        AuthService.updateCurrentUser(data.user);

				AuthService.auth().then(function(){
					$('#editUserModal').modal('hide');
				});
        
      })
      .error(function(){
          GlobalService.showSimpleDialog('Cannot update account detail. Please try again.');
          GlobalService.hideLoadingMask();
      });
    }

	$scope.logout = function(){
		// $('#btnLogout').addClass('selected');
		$location.path('/');
		// GlobalService.showLoadingMask(0);
		AuthService.logout()
		.success(function(data, status){
			// GlobalService.hideLoadingMask();
			// $('#btnLogout').removeClass('selected');
		})
		.error(function(data, status){
			// $('#btnLogout').removeClass('selected');
			// GlobalService.hideLoadingMask();
			if(status==401){
			}
		});
		
		localStorageService.remove('currentUser');
		localStorageService.remove('authToken');
		$rootScope.currentUserName = '';
		AuthService.currentUser = {};	
	}

  debugFunctions.call(this, $scope, $rootScope, $ionicUser, $ionicPush, AuthService, localStorageService);

}]);
