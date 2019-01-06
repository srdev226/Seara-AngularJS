'use strict';

angular.module('searaClientApp')
	.factory('LoadingMaskService', function($timeout, DialogService ){

		var loadingItemCount = 0;
		var _delay = 300;
		var timer;
		var timerForDelayHiding;

		var showLoadingMaskByTimeout = function(delay){
      $timeout(function(){
        if(loadingItemCount>0){
          $('#showLoadingModal').show();
        }
      }, delay);
  	}

		return {
		  showLoadingMaskByTimeout: showLoadingMaskByTimeout,
    	showLoadingMask: function(delay, noTimeout){
	      var hideLoadingMask = this.hideLoadingMask;
	      var showSimpleDialog = DialogService.showSimpleDialog;
	      if(!delay) delay = _delay;
	      loadingItemCount += 1;
	      showLoadingMaskByTimeout(delay);

	      $timeout.cancel(timer); //cancel the old one first

	      if(!noTimeout){
	        timer = $timeout(function() {
	          if(loadingItemCount>0){
	          	loadingItemCount = 1; // set it to one no matter what...
	            hideLoadingMask();
	            showSimpleDialog('Connection timeout. Please check Network connection.');
	          }
	        }, 30000);
	      }
	      
	    },

	    hideLoadingMask:  function(immediately){
      //delay hide a bit so it doesn't feel like flashing
      loadingItemCount -= 1;
      $timeout.cancel(timer);
      
      if(loadingItemCount<=0){
        loadingItemCount = 0;
        if(immediately){
          $('#showLoadingModal').hide();
          // $('.backdrop').remove();
        }
        else{
          timerForDelayHiding = $timeout(function(){
            if(loadingItemCount<=0){
              loadingItemCount = 0;
              $('#showLoadingModal').hide();
            }
          }, 800);
        }
      }
    }

    }
});
