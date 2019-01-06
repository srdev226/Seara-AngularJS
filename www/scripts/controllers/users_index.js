'use strict';

angular.module('searaClientApp')
  .controller('UsersIndexCtrl',function (AuthService, GlobalService, $scope, $location, $http, $interval, $rootScope) {

  	var token = AuthService.authToken;
    var apiUrl = GlobalService.apiUrl;

    var proxyRequest = GlobalService.proxyRequest;

    $scope.users = {};

    $scope.canEdit = $rootScope.canEditUsers;
		$scope.approveStatus = [];
		$scope.approveStatus[0] = 'Pending';
		$scope.approveStatus[1] = 'Approved';

    // $scope.groups = GlobalService.groups;
    $scope.groups = GlobalService.groups;

		$scope.groupName = GlobalService.groupName;

    $scope.showSearchUserDialog = function(){
      $('#searchUserModal').modal('show');
    }

    $scope.goToUserActivityLog = function(){
      $location.path('/management/users/'+$scope.selectedUser.id+'/activities');
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
				'users/approvedIndex?auth_token='+token,
				'GET'
			)
			.success(function(data, status){
        GlobalService.hideLoadingMask();
				$scope.users = data.users;
        $scope.officeLocations = data.office_locations;
        $scope.users.forEach(function(user){
          if(user.id==AuthService.currentUser.user_id){
            AuthService.updateCurrentUser(user);
          }
        });
			})
      .error(function(){
        GlobalService.hideLoadingMask();
        if(status==401) return;
        if(!$rootScope.isOnline){
          GlobalService.showSimpleDialog('No connection. Cannot load data.');
        }
        else{
          GlobalService.showSimpleDialog('Cannot connect to the server');
        }
      });
		}

		var promise;

		$scope.userMouseDown = function(user, index){
      $scope.selectedUserIndex = index;
      $('#userRowIndex'+index).addClass('selected');
      $scope.selectedUser = JSON.parse(JSON.stringify(user));

      $scope.holdingTimeSec = 1;
      //want to just use millisec but too slow from too much overhead
      $scope.holdingTime = $scope.holdingTimeSec*10;
      $interval.cancel(promise);
      promise = $interval(function () {
        $scope.holdingTime -= 1;
        if($scope.holdingTime<=0){
        	$interval.cancel(promise);
        	$scope.showUserOptionsDialog();
          $('.selected').removeClass('selected');
        }
      }, 100);   
    }

    $scope.userMouseUp = function () {
     $scope.selectedUserIndex = -1;
     $('.selected').removeClass('selected');
     if($scope.holdingTime>0){
     	 //
     }

     $interval.cancel(promise);
    }


    $scope.userMouseMove = function (){
    	$scope.selectedUserIndex = -1;
    	$scope.holdingTime=0;
      $interval.cancel(promise);
    }

    $scope.showUserOptionsDialog = function(){
      if($rootScope.canEditUsers){
    	 $('#userOptionsModal').modal('show');
      }
    }

    $scope.showEditUserDialog = function(){
    	$('#editUserModal').modal('show');
    }

    $scope.editUser = function(){
      GlobalService.showLoadingMask(0);
      GlobalService.proxyRequest('users/'+$scope.selectedUser.id+'?auth_token='+token,
       'PUT',
        $scope.selectedUser
      )
      .success(function(data){
         GlobalService.hideLoadingMask();
        if(data.error_message){
          GlobalService.showSimpleDialog(data.error_message);
          return;
        }

        $('#editUserModal').modal('hide');
        $scope.getUsers();
        AuthService.updateCurrentUser();

      })
      .error(function(){
        GlobalService.showSimpleDialog('Cannot update user detail. Please try again.');
        GlobalService.hideLoadingMask();
      });
    }

    $scope.showConfirmDeleteUserDialog =function(){
      $('#confirmDeleteUserModal').modal('show');
    }

    $scope.deleteUser = function(){
      GlobalService.showLoadingMask(0);
      GlobalService.proxyRequest('users/'+$scope.selectedUser.id+'?auth_token='+token,
       'DELETE'
      )
      .success(function(data){
        GlobalService.hideLoadingMask();
        if(data.error_type){
          GlobalService.showSimpleDialog('Cannot delete. Please try again.');
          return;
        }
        $scope.getUsers();
      })
      .error(function(){
          GlobalService.hideLoadingMask();
      });
    }

    var titlebarRightButtons = [
      { functionToCall: "showSearchUserDialog", args: '()', iconClass: 'search-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});

  
  




