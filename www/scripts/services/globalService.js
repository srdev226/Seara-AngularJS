'use strict';

angular.module('searaClientApp')
  .factory('GlobalService', function($http, $q, ServerConfigService, $rootScope, DialogService, LoadingMaskService, $timeout, $interval){

  var clientUrl = ServerConfigService.clientUrl;
  var apiUrl = ServerConfigService.apiUrl;
  var proxyType = ServerConfigService.proxyType;

  var phpProxyPath = 'scripts/proxy.php';

  var groups = {      
    // 0: 'Super',
    1: 'Admin',
    2: 'User'
  };

  var groupName = [];
  // groupName[0] ='Super' ;
  groupName[1] ='Admin';
  groupName[2] ='User' ;

  
  var syncingCount = 0;
  
  var counter;
  
  var showLoadingMaskByTimeout= LoadingMaskService.showLoadingMaskByTimeout;

  var proxyUrl = apiUrl;
  if(proxyType==='ionicProxy'){
    proxyUrl = clientUrl+'api/';
  }
  else if(proxyType==='phpProxy'){
    proxyUrl = clientUrl+phpProxyPath;
  }

  return {
    clientUrl: clientUrl,
    apiUrl: apiUrl,
    proxyUrl: proxyUrl,
    groupName: groupName,
    groups: groups,


    proxyRequest: function(url, method, postParams, hasTimeout){
      var paramData;
      if(!postParams){
        postParams = {};
      }
      postParams.REQUEST_METHOD = method;  //add method param
      paramData = $.param(postParams); //parameterized
      

      var httpConfig = {
        url: proxyUrl+url,
        method: method,
        data: paramData,
        headers:{
          'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      }

      if(proxyType==='phpProxy'){
        var encodedUrl = encodeURIComponent(apiUrl+url.trim());

        httpConfig = {
          url: proxyUrl+'?url='+encodedUrl, 
          method: 'POST',
          data: paramData,
          headers:{
            'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        } 
      }

      if(hasTimeout) {
        httpConfig['timeout'] = 30000;
      }
      return $http(httpConfig);
    },

    proxyDownload: function(url, method, postParams){
      var paramData;
      if(!postParams){
        postParams = {};
      }
      postParams.REQUEST_METHOD = method;  //add method param
      paramData = $.param(postParams); //parameterized
      
      var httpConfig = {
        url: proxyUrl+url,
        method: method,
        data: paramData,
        cache: false,
        responseType: 'arraybuffer',
        headers:{
          'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
        }
      }

      if(proxyType==='phpProxy'){
        var encodedUrl = encodeURIComponent(apiUrl+url.trim());

        httpConfig = {
          url: proxyUrl+'?url='+encodedUrl, 
          method: 'POST',
          data: paramData,
          cache: false,
          responseType: 'arraybuffer',
          headers:{
            'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'
          }
        } 
      }

      return $http(httpConfig);
    },

    proxyUpload: function(url, method, postParams, file){
      var params = angular.extend(postParams, { REQUEST_METHOD: method });
      if(file){
        angular.extend(params, {file: file});
      }

      var httpConfig = {
        url: proxyUrl+url,
        method: method,
        // headers: {'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'},
        headers: {'Content-Type' : 'multipart/form-data'},
        data: params,
        transformRequest: function (data, headersGetter) {
          var formData = new FormData();
          angular.forEach(data, function (value, key) {
              formData.append(key, value);
          });

          var headers = headersGetter();
          delete headers['Content-Type'];

          return formData;
        }
      };
      if(proxyType==='phpProxy'){
        httpConfig = {
          url: proxyUrl + '?url='+ encodeURIComponent(apiUrl+url.trim()),
          method: 'POST',
          // headers: {'Content-Type' : 'application/x-www-form-urlencoded; charset=UTF-8'},
          headers: {'Content-Type' : 'multipart/form-data'},
          data: params,
          transformRequest: function (data, headersGetter) {
            var formData = new FormData();
            angular.forEach(data, function (value, key) {
                formData.append(key, value);
            });

            var headers = headersGetter();
            delete headers['Content-Type'];

            return formData;
          }
        };
      }

      return $http(httpConfig);
    },

    testServer: function(){
      console.log('test connection to server');

      var testServerDeferred =  $q.defer();
      console.log('skip testing');
      testServerDeferred.resolve();
      return testServerDeferred.promise;

      this.proxyRequest('', 'GET')
      .then(function(response){
        if(response.status==200){
          testServerDeferred.resolve(response);
        }
        else{
          testServerDeferred.reject();
        }

      }, function(response){
        testServerDeferred.reject();
      });

      return testServerDeferred.promise;
    },


    getOfficeLocations: function(){
      return this.proxyRequest(
        'office_locations',
        'GET'
      );
      
    },

    formatDate: function(dateStr){
      var date = new Date(dateStr);
      var d = date.getDate();

      //leadingZeroAndOrdinalSuffix
      d = (d<10? '0':'')+d;
      // (d==11? 'th' :
      // d==12? 'th'  :
      // d%10==1? 'st':
      // d%10==2? 'nd':
      // d%10==3? 'rd': 'th');

      var monthName = ['Jan', 'Feb', 'Mar', 
      'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 
      'Oct', 'Nov', 'Dec'];
      return d+' '+monthName[date.getMonth()]+' '+date.getFullYear(); //+' '+date.getHours()+':'+date.getMinutes();
    },


    showSimpleDialog: function(message, description){
      DialogService.showSimpleDialog(message, description);
    },

    showLoadingMask: LoadingMaskService.showLoadingMask,

    hideLoadingMask: LoadingMaskService.hideLoadingMask,

    showSyncing: function(){
      syncingCount+=1;
      console.log('show syncing (left: '+syncingCount+')');
      if(syncingCount>0){
        $rootScope.syncing = true;
      }
    },

    hideSyncing: function(){
      syncingCount-=1;
      console.log('hide syncing (left: '+syncingCount+')');
      if(syncingCount<=0){
        syncingCount = 0;
        $rootScope.syncing = false;
      }
    },

    deleteKey: function(obj, key){
      try {
        delete obj[key];
      }catch(e){
        obj[key] = undefined;
      }
      return obj;
    },

    setSPosition: function(){
      $timeout(function () {
        var allMenuH = $('.all-menu').outerHeight();
        var sideLogoH = $('.side-logo').outerHeight();
        var mainMenuH = $('.main-menu').outerHeight();
        var subMenuH = $('.sub-menu').outerHeight();
        //ignore syncing if present
        if($('.sub-menu .syncing').length>0){
          subMenuH = subMenuH - $('.syncing').outerHeight();
        }
        var mainMenuContainerH = Math.min(allMenuH-sideLogoH-subMenuH, mainMenuH);
        $('.main-menu-container').css('height', mainMenuContainerH +'px');

        var backgroundSH = allMenuH-sideLogoH-mainMenuContainerH-subMenuH;

        if($('.background-s img').height()>backgroundSH){
          $('.background-s').remove();
        }
        else{
          $('.background-s').css('height', backgroundSH +'px');
        }

        if(allMenuH-sideLogoH-subMenuH < mainMenuH){
          $('.main-menu-container').css('overflow-y', 'scroll');
        }
      }, 0);
    }

  };
});
