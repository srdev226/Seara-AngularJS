'use strict';

angular.module('searaClientApp')
 .controller('ActivitiesIndexCtrl',function($scope, $rootScope, GlobalService, AuthService) {  
  
  $scope.activities = [];

  GlobalService.showLoadingMask(300);
  GlobalService.proxyRequest(
    'activities?auth_token='+AuthService.authToken,
    'GET'
  )
  .success(function (data, status){
      $scope.activities = data.activities;
      $scope.admins = data.admins;
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
    //console.log(data.message);
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

  $scope.showExportButton = true;
  $scope.showEmailActivitiesDialog = function(){
    $scope.adminId = $scope.admins[0].id;
    $('#emailActivitiesModal').modal('show');
  }

  $scope.emailActivities = function(){
    GlobalService.showLoadingMask(300);
    GlobalService.proxyRequest(
      'activities/email_csv?auth_token='+AuthService.authToken,
      'POST', { admin_id: $scope.adminId }
    )
    .success(function (data, status){
      if(data.success==true){
        $('#emailActivitiesModal').modal('hide');
      }
      GlobalService.hideLoadingMask();
      GlobalService.showSimpleDialog(data.message);
    })
    .error(function(){
      GlobalService.hideLoadingMask();
    });
  } 

  var titlebarRightButtons = [
    { functionToCall: "showEmailActivitiesDialog", args: '()', iconClass: null, text: 'Export' }
  ];
  $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});
	
