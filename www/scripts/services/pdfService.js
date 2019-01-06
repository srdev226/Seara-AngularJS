'use strict';

angular.module('searaClientApp')
  .factory('PdfService', function($http, GlobalService, ServerConfigService, AuthService, localStorageService, PresentationService, $q){

  var downloadPresentationPdf = function(assetId){
    GlobalService.showLoadingMask();
    GlobalService.proxyRequest('presentations/'+assetId+'/pdf?auth_token='+AuthService.authToken, 'GET')
    .success(function (data, status, headers) {
      if(data.error_message){
        GlobalService.showSimpleDialog(data.error_message);
        return;
      }
      
      var url = GlobalService.apiUrl+'presentations/download_pdf?temp_filename='+data.temp_filename+'&filename='+data.filename+'&auth_token='+AuthService.authToken;
      if(ServerConfigService.proxyType=='phpProxy'){
        url = GlobalService.clientUrl+'scripts/download_pdf.php?temp_filename='+data.temp_filename+'&filename='+data.filename;
      }
      var iframe = $('#tempIframe');
      if(iframe.length==0){
        iframe = $('<iframe>');
        iframe.attr('id', 'tempIframe');
      }
      iframe.attr('src', url);
      $('body').append(iframe);
      setTimeout(function(){
        GlobalService.hideLoadingMask();
      }, 0);
    })
    .error( function () {
      GlobalService.hideLoadingMask();
      GlobalService.showSimpleDialog('failed to create pdf file');  
    });

    // GlobalService.showLoadingMask();
    // var pdfPromise = generatePdfFromPresentation(assetId);
    // if(pdfPromise){
    //   pdfPromise.then(function(doc){
    //     doc.save(assetName+'.pdf');
    //     GlobalService.hideLoadingMask();
    //   });      
    // }
    // else{
    //   GlobalService.hideLoadingMask();
    //   GlobalService.showSimpleDialog('failed to create pdf file');  
    // }
  }

  var emailPresentationPdf = function(assetId, email){
    GlobalService.showLoadingMask(0, true);
    GlobalService.proxyRequest('presentations/'+assetId+'/email?auth_token='+AuthService.authToken, 'POST',
      {
        'email': email
      }
    )
    .success(function (data) {
      GlobalService.hideLoadingMask();
      if(data.error_message){
        GlobalService.showSimpleDialog(data.error_message);
        return;
      }
      GlobalService.showSimpleDialog(data.message);
      $('#emailPresentationModal').modal('hide');
    })
    .error( function () {
      GlobalService.hideLoadingMask();
      GlobalService.showSimpleDialog('failed to create pdf file');  
    });

    // GlobalService.showLoadingMask(0, true);
    // var pdfPromise = generatePdfFromPresentation(assetId);
    // if(pdfPromise){
    //   pdfPromise.then(function(doc){
    //     GlobalService.proxyUpload('presentations/email?auth_token='+AuthService.authToken,
    //       'POST',
    //       {
    //         'name': assetName,
    //         'email': email
    //       },
    //       //blob itself has no filename in it, I set it at proxy.php using param 'name'
    //       doc.output('blob')
    //     )
    //     .success(function(data){
    //       if(data.success==true){
    //         $('#emailPresentationModal').modal('hide');
    //       }
    //       GlobalService.hideLoadingMask();
    //       GlobalService.showSimpleDialog(data.message);
    //     })
    //     .error(function(){
    //       GlobalService.hideLoadingMask();
    //     })
    //   });
    // }
    // else{
    //   GlobalService.hideLoadingMask();
    //   GlobalService.showSimpleDialog('failed to create pdf file');  
    // }
  }

  //this method mainly ready the presentation data
  var generatePdfFromPresentation = function(assetId) {
    var pdfDeferred = $q.defer();

    var presentation = null;
    var presentation_slides = {};

    ///////////////////////////////////////////////////
    ////////////////// duplicate code with PresentationService
    var waitForPresentationData = $q.defer();

    var presentationExist = false;
    if(window.useLocalStorage){
      var localPresentation = localStorageService.get('localAssetToPresentation');
      if(localPresentation[''+assetId]){
        var presentationData = localPresentation[''+assetId];
        var data = {};
        data.presentation = presentationData.presentation;
        data.presentation_slides = presentationData.presentation_slides;
        presentationExist = true;
        waitForPresentationData.resolve(data);
      }     
    }
    
    if(!presentationExist){
      GlobalService.proxyRequest(
        'presentations/'+assetId + '?auth_token='+AuthService.authToken,
        'GET'
      )
      .success(function(data, status){
        presentationExist = true;
        waitForPresentationData.resolve(data);
      })
      .error(function(error){
        waitForPresentationData.reject();
      });
    }

    waitForPresentationData.promise.then(function(data){

      presentation = data.presentation;
      //sort by position 
      presentation_slides = data.presentation_slides;
      
      if(presentation_slides.length<=0){
        GlobalService.showSimpleDialog('This presentation is empty');
        return false;
      }

      //add presentation cover slide
      presentation_slides.unshift({id: 'cover', transition: 'none'});
      var slideCoverImagePath = '../images/Seara-App-Pres-Cover-Slide.jpg';

      var slideImageSources = [];
      var logoImageSource = null;
      if(presentation.logo_asset_id){
        logoImageSource = PresentationService.getImageSource(presentation.logo_asset_id);
      }

      presentation_slides.forEach(function(slide){
        var imgSrc = slide.id=='cover'? slideCoverImagePath: PresentationService.getSlideImageSource(slide.id);
        slideImageSources.push(imgSrc);
      });
      
      // nested promise, wait for generatePdf() then resolve that data
      var pdfPromise = generatePdf(slideImageSources, logoImageSource, presentation);

      pdfPromise.then(function(doc){
        pdfDeferred.resolve(doc);
      });
    }, function(){
      console.log('Error loading presentation.');
    });

    return pdfDeferred.promise;
  }

  var generatePdf = function(imageSources, logoImageSource, presentation){

    // pdf page size (a4 lanscape) and image scale (fit to page = 1)
    var paperSize = 'a4';
    var paperOrientation = 'landscape'; 
    var paperHeight = 595.28;
    var paperWidth = 841.89;
    var imageScale = 1;
    var descriptionFontSize = 11;
    var titleFontSize = 18;

    var doc = new jsPDF(paperOrientation, 'pt', paperSize);
        
    var withLogo = false;
    if(logoImageSource!=null) withLogo = true;

    var imageDataPromises = [];

    imageSources.forEach(function(imageSource){
      imageDataPromises.push(getBase64FromImageUrl(imageSource));
    });
    
    var logoPromise = getBase64FromImageUrl(logoImageSource);

    var pdfDeferred = $q.defer();

    $q.all(imageDataPromises.concat(logoPromise)).then(function(data){

      var logoData = data.pop();
      var imageDataList = data;

      imageDataList.forEach(function(imageData, index){

        var dataURL = imageData.dataURL;
        var imageWidth = imageData.width;
        var imageHeight = imageData.height;

        var imageOrientation =  (imageWidth/paperWidth) > (imageHeight/paperHeight) ? "full-width": "full-height";

        var realImageWidth = paperWidth*imageScale;
        var realImageHeight = imageHeight/imageWidth*paperWidth*imageScale;
        if(imageOrientation==="full-height"){
          realImageWidth = imageWidth/imageHeight*paperHeight;
          realImageHeight = paperHeight;
        }
        var x = (paperWidth-realImageWidth)/2;;
        var y = (paperHeight-realImageHeight)/2;

        doc.addImage(dataURL, 'JPEG', x, y, realImageWidth, realImageHeight);

        //add logo
        if(index==0){
          if(logoData!=null){
            var realLogoHeight = realImageHeight*0.19-10;
            var realLogoWidth = logoData.width/logoData.height*realLogoHeight;
            var logoX = x+10;
            var logoY = y+realImageHeight-realLogoHeight-10;

            doc.addImage(logoData.dataURL, 'JPEG', logoX, logoY, realLogoWidth, realLogoHeight);
          }

          var verticalOffsetTitle = 18;
          var verticalOffsetDescription = 12;

          var textY = y+realImageHeight-10-verticalOffsetDescription;
          //write text from the last line up to title
          doc.setTextColor(255,255,255);
          doc.setFontSize(descriptionFontSize);
          doc.setFontType('normal');

          var splitDescription = [];
          if(presentation.description){
            splitDescription = doc.splitTextToSize(presentation.description, 0.4*realImageWidth-10);
          }
          splitDescription.reverse().forEach(function(text){
            var textWidth = doc.getStringUnitWidth(text)*descriptionFontSize/doc.internal.scaleFactor;
            doc.text(x+realImageWidth-10-textWidth, textY, text);
            textY-=verticalOffsetDescription;
          });
          textY -= 10;

          doc.setFontSize(titleFontSize);
          doc.setFontType('bold');

          var splitTitle = doc.splitTextToSize(presentation.title, 0.4*realImageWidth-10);
          splitTitle.reverse().forEach(function(text){
            var upText = text.toUpperCase();
            var textWidth = doc.getStringUnitWidth(upText)*titleFontSize/doc.internal.scaleFactor;
            doc.text(x+realImageWidth-10-textWidth, textY, upText);
            textY-=verticalOffsetTitle;
          });


        }

        if(index!=imageDataList.length-1){          
          doc.addPage(paperSize, paperOrientation=='landscape'? 'l': 'p');
        }  
      });
      
      pdfDeferred.resolve(doc);
    });
    
    return pdfDeferred.promise;

  }

  function getBase64FromImageUrl(URL) {

    var deferred = $q.defer();

    if(URL==null){
      deferred.resolve(null);
      return deferred.promise;
    }

    var img = new Image();

    img.crossOrigin = "anonymous";
    
    var canvas = document.createElement("canvas");

    var ctx = canvas.getContext("2d");

    img.onload = function () {
      // resize image to <1024*1024
      var scale = 1;
      if(this.width>this.height){
        if(this.width>1024){
          scale = 1024.0/this.width
        }
      }      
      else{
        if(this.height>1024){
          scale = 1024.0/this.height
        }
      }

      canvas.width =this.width*scale;
      canvas.height =this.height*scale;

      ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, canvas.width, canvas.height);

      var dataURL = canvas.toDataURL("image/jpg");

      deferred.resolve({
        dataURL: dataURL, width: this.width, height: this.height
      });
    }

    img.src = URL;

    return deferred.promise;
  }

  return {
    downloadPresentationPdf: downloadPresentationPdf,
    emailPresentationPdf: emailPresentationPdf
  };

});


