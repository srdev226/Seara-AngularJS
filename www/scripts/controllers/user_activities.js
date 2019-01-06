'use strict';

angular.module('searaClientApp')
  .controller('UserActivitiesCtrl',function ($routeParams, AuthService, GlobalService, $scope, $location, $interval, $rootScope) {

  	var token = AuthService.authToken;
    var apiUrl = GlobalService.apiUrl;

    var proxyRequest = GlobalService.proxyRequest;

    $scope.backLink = '#/management/users/index';

    $scope.activities = [];

    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'activities/user/'+$routeParams['id']+'?auth_token='+AuthService.authToken,
      'GET'
    )
    .success(function (data, status){
      if(data.user && data.user.name){
        $scope.userName = data.user.name;
        $rootScope.titleName = data.user.name;
      }
      $scope.activities = data.activities;
      $scope.activities.forEach(function(act) {
        act.created_at = formatDateTime(act.created_at);
      });
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

    var formatDateTime = function(dateStr){
      var date = new Date(dateStr);
      var d = date.getDate();

      //leadingZeroAndOrdinalSuffix
      d = (d<10? '0':'')+d+
        (d==11? 'th' :
        d==12? 'th'  :
        d%10==1? 'st':
        d%10==2? 'nd':
        d%10==3? 'rd': 'th');
      // var monthName = ['']
      var monthName = ['January', 'February', 'March', 
      'April', 'May', 'June', 
      'July', 'August', 'September', 
      'October', 'November', 'December'];
      return d+' '+monthName[date.getMonth()]+' '+date.getFullYear()+' '+date.getHours()+':'+date.getMinutes();
    }

});

  
  




