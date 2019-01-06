'use strict';

angular.module('searaClientApp')
	.factory('GeneralConfigService', function(){
  		
  		// size in MB
  		var maxImageSize = 2;
  		var maxThumbnailSize = 1;
  		var maxPdfSize = 20;

		return {
			maxImageSizeBytes: maxImageSize*1024*1024,
			maxThumbnailSizeBytes: maxThumbnailSize*1024*1024,
			maxPdfSizeBytes: maxPdfSize*1024*1024,
			maxImageSizeText: maxImageSize+' MB',
			maxThumbnailSizeText: maxThumbnailSize+' MB',
			maxPdfSizeText: maxPdfSize+' MB',
		};
});
