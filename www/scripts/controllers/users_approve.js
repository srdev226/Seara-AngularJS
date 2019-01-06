'use strict';

angular.module('searaClientApp')
  .controller('UsersApproveCtrl',function (AuthService, GlobalService, $scope, $location, $rootScope) {

  	var token = AuthService.authToken;
    var apiUrl = GlobalService.apiUrl;

    var proxyRequest = GlobalService.proxyRequest;

    $scope.users = {};
    $rootScope.titleName = 'Approve new User Requests';

    $scope.groups = GlobalService.groups;

		$scope.groupName = GlobalService.groupName;

		 $scope.showSearchUserDialog = function(){
      $('#searchUserModal').modal('show');
    }

    $scope.searchUser = function(){
      $scope.searchText = $scope.userSearchText;
      $('.search-bar').removeClass('hide');
      $('.users-index-container').height('100%');
      $('.users-index-container').height($('.users-index-container').height()-$('.search-bar').height());
    }
    
    $scope.clearSearch = function(){
      $scope.searchText='';
      $scope.userSearchText = '';
      $('.search-bar').addClass('hide');
      $('.users-index-container').height('100%');
    }


	$scope.getUsers = function(){
		GlobalService.showLoadingMask();
		proxyRequest(
			'users/unapprovedIndex?auth_token='+token,
			'GET'
		)
		.success(function(data, status){
			GlobalService.hideLoadingMask();
			$scope.users = data.users;				
		})
	      .error(function(){
	        GlobalService.hideLoadingMask();
	        if(!$rootScope.isOnline){
		        GlobalService.showSimpleDialog('No connection. Cannot load data.');
	        }
	        else{
	        	if(status==401) return;
	          GlobalService.showSimpleDialog('Cannot connect to the server');
	        }
	      });

	}

	$scope.approveUser = function(userId){
		GlobalService.showLoadingMask();
		proxyRequest(
			'users/'+userId+'/approve?auth_token='+token,
			'POST'
		)
		.success(function(data, status){
			GlobalService.hideLoadingMask();
			GlobalService.showSimpleDialog('User has been approved');
			$scope.getUsers();

		})
		.error(function(){
			GlobalService.hideLoadingMask();
			GlobalService.showSimpleDialog('Cannot approve user. Please try again.')
		});
	}

	$scope.deleteUser = function(userId){
		GlobalService.showLoadingMask();
		proxyRequest(
			'users/'+userId+'?auth_token='+token,
			'DELETE'
		)
		.success(function(data, status){
			GlobalService.hideLoadingMask();
			GlobalService.showSimpleDialog('User has been deleted');
			$scope.getUsers();
		});
	}

    var titlebarRightButtons = [
      { functionToCall: "showSearchUserDialog", args: '()', iconClass: 'search-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});
	
	




