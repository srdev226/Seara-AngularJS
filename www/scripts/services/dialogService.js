'use strict';

angular.module('searaClientApp')
	.factory('DialogService', function($rootScope ){
		return {
		  showSimpleDialog: function(message, description){
        $rootScope.simpleDialogMessage = message;

        $rootScope.simpleDialogDescription = description || '';
        $('#simpleDialogModal').modal('show');
        //call func?
		  }
    }
});
