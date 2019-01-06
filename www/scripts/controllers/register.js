'use strict';

angular.module('searaClientApp')
	.controller('RegisterCtrl', function(AuthService, GlobalService, localStorageService, $scope, $routeParams, $location){

		var proxyRequest =  GlobalService.proxyRequest;

		$scope.user = {

		};

		$scope.register = function(){
			// if(!$scope.validateForm()){
			$scope.emailNotMatch = false;
			$scope.passwordNotMatch = false;
			if($scope.formRegister.$invalid){ //should not execute because button disabled
				$scope.user.password='';
				$scope.confirmPassword = '';
				GlobalService.showSimpleDialog('Please fill in the form correctly'); 
				return;
			}
			else if($scope.user.email!=$scope.confirmEmail){
				$scope.user.email='';
				$scope.confirmEmail = '';
				$scope.user.password='';
				$scope.confirmPassword = '';
				GlobalService.showSimpleDialog('Confirm e-mail does not match'); 
				// $scope.emailNotMatch = true;
				return;
			}
			else if($scope.user.password!=$scope.confirmPassword){
				$scope.user.password='';
				$scope.confirmPassword = '';
				GlobalService.showSimpleDialog('Confirm password does not match'); 
				// $scope.passwordNotMatch = true;
				return;
			}

			GlobalService.showLoadingMask();
			proxyRequest(
				'registrations',
				'POST',
				$scope.user
			)
			.success(function(data, status){
				if(data.error_message){
					GlobalService.hideLoadingMask();
					GlobalService.showSimpleDialog(data.error_message); 
					return;
				}
				GlobalService.hideLoadingMask(0);
				GlobalService.showSimpleDialog('Register success', 'Please wait for your registration to be approved by the admin before accessing. You will receive an email when your account has been activated.');
				$location.path('login');
			})
			.error(function(data, status){
				GlobalService.hideLoadingMask();
				GlobalService.showSimpleDialog('Cannot register. Please try again.');
			});
		}


		$scope.cancel = function(){
			$location.path('/');
		}		

		$scope.loadOffice = function(){
			GlobalService.getOfficeLocations()
				.success(function(data, status){
					$scope.officeLocations=data.office_locations;
			});		
			console.log($scope.officeLocations);	
		}
		GlobalService.getOfficeLocations()
			.success(function(data, status){
				$scope.officeLocations=data.office_locations;
		});

});