'use strict';

angular.module('searaClientApp')
	.factory('ServerConfigService', function(){

		var USE_OPTION_NUMBER = 8;

		var options = [
			// for device
			['local', 'noProxy'], //0
			['sandbox', 'noProxy'], //1
			['server', 'noProxy'], //2
			// for ionic server
			// *** change ip in ionic.project ***
			['local', 'ionicProxy'], //3
			['sandbox', 'ionicProxy'], //4
			['server', 'ionicProxy'], //5
			// for apache server
			['local', 'phpProxy'], //6
			['sandbox', 'phpProxy'], //7
			['server', 'phpProxy'], //8
		];


		/////////////////////////////////////////////////////

		var host = options[USE_OPTION_NUMBER][0];
		var proxyType = options[USE_OPTION_NUMBER][1];

		var localConfig = {
			clientUrl: 'http://192.168.1.107:8100/',
			apiUrl: 'http://192.168.1.107:3001/api/v2/'
		};

		var sandboxConfig = {
			clientUrl: 'http://192.168.1.107:8100/',
			apiUrl: 'http://128.199.131.103:8081/api/v2/'
		};
		
		// http: or https: only
		var protocol = 'https:';
		if (window.location.protocol=='http:') protocol = 'http:';

		var serverConfig = {
      clientUrl: protocol+'//app.searasports.com/',
      apiUrl: protocol+'//api.searasports.com/api/v2/'
		};

		
		var configVar = localConfig;
		if(host == 'sandbox') {
			configVar = sandboxConfig;
		}
		else if(host == 'server') {
			configVar = serverConfig;
		}

		var clientUrl = configVar.clientUrl;
		var apiUrl = configVar.apiUrl;

  	
		return {
			clientUrl: clientUrl,
			apiUrl: apiUrl,
			proxyType: proxyType
		};
});
