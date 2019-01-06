'use strict';

angular.module('searaClientApp')
	.factory('LocalPathService', function(){
		var localDataPath = '';
		var localContentPath = 'contents/';
		if(window.isTablet && window.useLocalFileSystem && typeof cordova !== 'undefined' && typeof cordova.file !== 'undefined'){
			localDataPath = cordova.file.dataDirectory;
			localContentPath = cordova.file.dataDirectory+'contents/';
		}
		return {
			localDataPath: localDataPath,
			localContentPath: localContentPath
		}
});
