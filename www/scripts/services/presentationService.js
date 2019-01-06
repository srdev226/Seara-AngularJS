angular.module('searaClientApp')
  .factory('PresentationService', function($q, $timeout, $interval, GlobalService, AuthService, localStorageService, LocalPathService){

  // available transitions
  var transitionTypes = ['fade', 'zoom', 'move']
  var transitionSpeeds = ['slow', 'medium', 'fast'];
  var transitionSpeedMilliSecs = {slow: 2.4, medium: 1.2, fast: 0.6};

  // path to local storage if on device
  var localDataPath = LocalPathService.localDataPath;
  var localContentPath = LocalPathService.localContentPath;

  //get all combinations of "tran-" class used for removing all "tran-" class when set up next slide
  var concatTransitionClassName = function(){
    var names = 'tran-none';
    transitionTypes.forEach(function(transitionType){
      names += ' tran-'+transitionType;
    });
    transitionSpeeds.forEach(function(transitionSpeed){
      names += ' tran-'+transitionSpeed;
    });
    return names;
  }
  var allTransitionClassName = concatTransitionClassName();

  var getSlideImageSource = function(presentationSlideId, decache){
    // even local file is cache
    // but if in presentation viewer, random decache on each start
    if(!decache){
      decache = Math.random();
    }

    if(window.useLocalFileSystem){
      var localSlideToContent =  localStorageService.get('localSlideToContent');
      var localContents = localStorageService.get('localContents');
      var contentId = localSlideToContent[''+presentationSlideId];
      if(localContents[''+contentId]){
        return localContentPath+contentId+'?'+decache;
      }
    }
    return GlobalService.apiUrl+'presentation_slides/'+presentationSlideId+'/image?auth_token='+AuthService.authToken+'&'+decache;
  }

  var getSlideThumbnailSource = function(presentationSlideId, decache){
    if(!decache){
      decache = Math.random();
    }

    // console.log('decache random num: '+decache);
    if(window.useLocalFileSystem){
      var localSlideToContent =  localStorageService.get('localSlideToContent');
      var localContents = localStorageService.get('localContents');
      var contentId = localSlideToContent[''+presentationSlideId];
      if(localContents[''+contentId]){
        return localContentPath+contentId+'?'+decache;
      }
    }
    return GlobalService.apiUrl+'presentation_slides/'+presentationSlideId+'/thumbnail?auth_token='+AuthService.authToken+'&'+decache;
  }

  var getImageSource = function(assetId, decache){
    if(!decache){
      decache = Math.random();
    }

    if(window.useLocalFileSystem){
      var localAssetToContent =  localStorageService.get('localAssetToContent');
      var localContents = localStorageService.get('localContents');
      if(localAssetToContent[''+assetId] &&  localContents[''+localAssetToContent[''+assetId]]){
        console.log('get image from local source');
        return localContentPath + localAssetToContent[''+assetId]+'?auth_token='+AuthService.authToken+'&'+decache;
      }
    }
    console.log('get image from remote source');
    return GlobalService.apiUrl+'assets/'+assetId+'?auth_token='+AuthService.authToken+'&'+decache;
  }

  var getThumbnailSource = function (assetId, decache) {
    if(!decache){
      decache = Math.random();
    }

    if(window.useLocalFileSystem){
      var localAssetToPresentation = localStorageService.get('localAssetToPresentation');
      var localAssetToContent =  localStorageService.get('localAssetToContent');
      var localContents = localStorageService.get('localContents');
      if(localAssetToPresentation[''+assetId]){
        var presentation =  localAssetToPresentation[''+assetId];
        var firstSlide = presentation.presentation_slides[0];
        if(!firstSlide){
          return null;
        }
        if( localContents[''+firstSlide.content_id]){
          return localContentPath+'thumbnail_'+firstSlide.content_id+'?auth_token='+AuthService.authToken+'&'+decache;
        }
      }
      else if(localAssetToContent[''+assetId] && localContents[''+localAssetToContent[''+assetId]]){
        return localContentPath+'thumbnail_'+localAssetToContent[''+assetId]+'?'+decache;
      }
    }
    return GlobalService.apiUrl+'assets/'+assetId+'/thumbnail?auth_token='+AuthService.authToken+'&'+decache;
  }

  // return promise object, can be changed to return normally later
  var getImageOrientation = function(imageWidth, imageHeight, divClass){
    var deferred = $q.defer();

    var img = {w: imageWidth, h: imageHeight};
    var c = divClass? {w: $(divClass).width(), h: $(divClass).height()}:{w: $(document).width(), h: $(document).height()};
    var imageOrientation =  (img.w/c.w) > (img.h/c.h) ? "full-width": "full-height";
    deferred.resolve(imageOrientation);

    return deferred.promise;
  }

  var startPresentation = function(scope, assetId){
    scope.showEndOfPresentation = true;
    scope.presentation_slides = {};
    scope.slideImageSource = [];
    scope.slideImageSourceForCache = [];
    scope.slideImageOrientation = [];

    var that = this;
    var waitForPresentationData = $q.defer();
    GlobalService.showLoadingMask();

    // for re-selecting slide if in presentation editor, get id of selected slide
    var currentlySelectedSlideId = null;
    var currentlySelectedSlide = $('.selected-slide-border');
    if(currentlySelectedSlide.length>0){
      currentlySelectedSlideId = currentlySelectedSlide.attr('id').replace('slideBorder', '');
    }

    if(window.useLocalStorage){
      var localPresentation = localStorageService.get('localAssetToPresentation');
      if(localPresentation[''+assetId]){
        var presentationData = localPresentation[''+assetId];
        var data = {};
        data.presentation = presentationData.presentation;
        data.presentation_slides = presentationData.presentation_slides;
        waitForPresentationData.resolve(data);
      }
      else{
        GlobalService.proxyRequest(
          'presentations/'+assetId + '?auth_token='+AuthService.authToken,
          'GET'
        )
        .success(function(data, status){
          waitForPresentationData.resolve(data);
        })
        .error(function(error){
          GlobalService.hideLoadingMask();
          waitForPresentationData.reject();
        });
      }
    }
    else{
      GlobalService.proxyRequest(
        'presentations/'+assetId + '?auth_token='+AuthService.authToken,
        'GET'
      )
      .success(function(data, status){
        waitForPresentationData.resolve(data);
      })
      .error(function(error){
        GlobalService.hideLoadingMask();
        waitForPresentationData.reject();
      });
    }

    waitForPresentationData.promise.then(
      // waitForPresentationData success
      function(data){

        scope.presentation = data.presentation;
        //sort by position
        scope.presentation_slides = data.presentation_slides;

        if(currentlySelectedSlideId!=null) {
          $timeout(function() {
            $('#slideBorder'+currentlySelectedSlideId).addClass('selected-slide-border');
          }, 100);
        }
        // scope.presentation_slides = data.presentation_slides.sort(function(slideA,slideB){
        //   return slideA.position>slideB.position
        // });
        if(scope.presentation_slides.length<=0){
          GlobalService.hideLoadingMask();
          GlobalService.showSimpleDialog('This presentation is empty');
          return;
        }

        //add presentation cover and end slide
        var slideCoverImagePath = 'images/Seara-App-Pres-Cover-Slide.jpg';
        scope.presentation_slides.unshift({id: 'cover', transition_type: 'none', image_width: 1024, image_height: 768});
        if(scope.showEndOfPresentation){
          scope.presentation_slides.push({id: 'end', transition_type: 'none', image_width: 1, image_height: 1});
        }

        var waitForLogo = $q.defer();
        var waitForPresentation = $q.defer();
        var decache = Math.random();

        $('.presentation-cover-logo img').unbind('load');
        if(scope.presentation.logo_asset_id){

          // wait for logo first
          $('.presentation-cover-logo img').load(function(){
            waitForLogo.resolve();
          });

          var logoTimeout = $timeout(function(){
            // just show up without complete logo
            console.log('logo timeout');
            waitForLogo.resolve();
          },5000);

          // set new img src
          scope.presentationLogoSource = getImageSource(scope.presentation.logo_asset_id, decache);
        }
        else{
          scope.presentationLogoSource = '//:0';
          waitForLogo.resolve();
        }

        var index=0;

        var promises = [];

        scope.presentation_slides.forEach(function(slide){
          promises.push(getImageOrientation(slide.image_width, slide.image_height));
        });

        $q.all(promises).then(function(orientationClasses){
          var i=0;
          scope.presentation_slides.forEach(function(slide){
            var imgSrc = getSlideImageSource(slide.id, decache);
            if(slide.id=='cover'){
              imgSrc = slideCoverImagePath;
            }
            else if(slide.id=='end'){
              imgSrc = '//:0';
            }
            scope.slideImageSource.push(imgSrc);
            if(!window.isTablet){
              scope.slideImageSourceForCache.push(imgSrc);
            }

            scope.slideImageOrientation.push(orientationClasses[i]);

            ///////// hotspots stuffs //////////
            // decache is still needed, to make .load below work....
            // even if it cause presentation to show up before images are completed

            // var hotspots_x = slide.hotspots_x;
            // var hotspots_y = slide.hotspots_y;
            // var hotspots_width = slide.hotspots_width;
            // var hotspots_height = slide.hotspots_height;

            //not stacked because removed all at endSlide()
            //now have to delay a bit because cannot get real offset attribute
            // $('#slideImage'+i).load(function(){
              // var id = this.id;
              // $timeout(function(){
                // initHotspot(id, hotspots_x, hotspots_y, hotspots_width, hotspots_height);
              // },100);
            // });
            i++;
          });

          waitForPresentation.resolve();

          $q.all([waitForLogo.promise, waitForPresentation.promise]).then(
            function(){
              GlobalService.hideLoadingMask();
              that.startSlide(scope);
            },
            function(){
              GlobalService.hideLoadingMask();
              console.log('cannot show presentation viewer');
            }
          );
        });
      },
      // waitForPresentationData success end

      // waitForPresentationData fail
      function(){
        GlobalService.hideLoadingMask();
        console.log('Cannot load presentation');
      }
      // waitForPresentationData fail end
    );
  }

  // Global var
  var waitForAnimation = null;
  var animationTime = 0;
  var skipAnimationOnNext = false;
  function swapSlideAB(scope){
    var deferred = $q.defer();
    $timeout(function(){
      if(scope.currentSlideIndex==0 && !scope.showCover){
        $timeout(function(){
          setLogoAndTextPosition();
          scope.showCover=true;
          deferred.resolve();
        },200);
      }
      else{
        deferred.resolve();
      }
    }, 0);

    deferred.promise.then(function(){
      GlobalService.hideLoadingMask(true);
      if(scope.slidePointer=='A'){
        $('.slide-B').removeClass('show');
        $('.slide-A').addClass('show');
      }
      else{
        $('.slide-A').removeClass('show');
        $('.slide-B').addClass('show');
      }

      skipAnimationOnNext = true;

      if(waitForAnimation){
        $timeout.cancel(waitForAnimation);
      }
      waitForAnimation = $timeout(function(){
        skipAnimationOnNext = false;
      }, animationTime*1000);
    });
  }

  function setLogoAndTextPosition(){
    var slideImageCover = $('#slideImage_cover');
    var left = slideImageCover[0].offsetLeft;
    var right = slideImageCover.parent().width()-slideImageCover.width()-slideImageCover[0].offsetLeft;
    var logoWidth = slideImageCover.width()*0.3;
    var logoHeight = slideImageCover.height()*0.1967;
    var textWidth = slideImageCover.width()*0.65;

    $('.presentation-cover-text').css('right', right+'px');
    $('.presentation-cover-text').css('width', textWidth+'px');
    $('.presentation-cover-logo').css('left', left+'px');
    $('.presentation-cover-logo').css('width', logoWidth+'px');
    $('.presentation-cover-logo').css('height', logoHeight+'px');

    var bottom = slideImageCover.parent().height()-slideImageCover.height()-slideImageCover[0].offsetTop;

    $('.presentation-cover-text').css('bottom', bottom+'px');
    $('.presentation-cover-logo').css('bottom', bottom+'px');
  }

  var startSlide = function(scope){
    scope.slidePointer = 'A';
    $('img.slide-image').unbind('load');
    $('img.slide-image').load(function(){
      if($(this).hasClass('slide'+scope.slidePointer+'-image')){
        swapSlideAB(scope);
      }
    });

    scope.currentSlideIndex = 0;
    scope.slideAShowClass = '';
    scope.slideBShowClass = '';
    $('.slide-A').removeClass(allTransitionClassName+' tran-animation previous next');
    $('.slide-B').removeClass(allTransitionClassName+' tran-animation previous next');

    var transitionClass = 'tran-'+scope.presentation_slides[0].transition_type;
    if(scope.presentation_slides[0].transition_speed){
      transitionClass = transitionClass+' tran-'+scope.presentation_slides[0].transition_speed;
    }

    var manualShow = false;
    if(scope.slideA){
      if(scope.slideImageSource[0]==scope.slideA.imageSource){
        manualShow = true;
      }
    }
    scope.slideA = {
      index: 'cover',
      typeClass: 'cover',
      imageOrientation: scope.slideImageOrientation[0],
      imageSource: scope.slideImageSource[0]
    }

    scope.slideB = {
      index: '',
      typeClass: '',
      imageOrientation: '',
      imageSource: '//:0'
    };

    $('.slide-A').addClass('tran-none');
    $('.slide-B').addClass('tran-none');
    if(manualShow){
      swapSlideAB(scope);
    }

    $('#showPresentationViewerModal').modal('show');
  }

  var getTransitionClass = function(scope, currentSlideIndex){
    var transitionClass = 'tran-'+scope.presentation_slides[currentSlideIndex].transition_type;
    if(scope.presentation_slides[currentSlideIndex].transition_type!='none' &&
      scope.presentation_slides[currentSlideIndex].transition_speed)
    {
      transitionClass = transitionClass+' tran-'+scope.presentation_slides[currentSlideIndex].transition_speed;
      animationTime = transitionSpeedMilliSecs[scope.presentation_slides[currentSlideIndex].transition_speed];
    }
    else{
      animationTime = 0;
    }
    return transitionClass;
  }

  var prepareGoingToSlideHash = function(scope, goingToSlideIndex){
    var goingToSlide = {
      index: goingToSlideIndex,
      typeClass: 'normal',
      imageOrientation: scope.slideImageOrientation[goingToSlideIndex],
      imageSourceToBeSet: scope.slideImageSource[goingToSlideIndex]
    };

    if(goingToSlideIndex==0){
      goingToSlide.index = 'cover';
      goingToSlide.typeClass = 'cover';
    }
    else if(goingToSlideIndex==scope.presentation_slides.length-1){
      goingToSlide.index = 'end';
      goingToSlide.typeClass = 'end';
      goingToSlide.imageOrientation = null;
      goingToSlide.imageSourceToBeSet = '//:0';
    }
    return goingToSlide;
  }

  var applyGoingToSlide = function(scope, goingToSlide, direction, transitionClass){
    var slideFrom = slideTo = null;

    if(scope.slidePointer=='A'){ // going to slideB
      slideFrom = 'A';
      slideTo = 'B';
      scope.slidePointer='B';
    }
    else{ // going to slideA
      slideFrom = 'B';
      slideTo = 'A';
      scope.slidePointer='A';
    }
    // set imageSource on old slide
    goingToSlide.imageSource = scope['slide'+slideTo].imageSource;
    scope['slide'+slideTo] = goingToSlide;

    $('.slide-'+slideFrom).removeClass('tran-animation');
    $('.slide-'+slideTo).removeClass('tran-animation');

    $timeout(function(){
      $('.slide-'+slideFrom).removeClass(allTransitionClassName+' previous next');
      $('.slide-'+slideTo).removeClass(allTransitionClassName+' previous next');

      if(direction=='next'){
        $('.slide-'+slideFrom).addClass(transitionClass+' previous');
        $('.slide-'+slideTo).addClass(transitionClass+' next');
      }
      else{
        $('.slide-'+slideTo).addClass(transitionClass+' previous');
        $('.slide-'+slideFrom).addClass(transitionClass+' next');
      }

      $timeout(function(){
        $('.slide-'+slideFrom).addClass('tran-animation');
        $('.slide-'+slideTo).addClass('tran-animation');
        GlobalService.hideLoadingMask();
        GlobalService.showLoadingMask(2000);
        // manual hide/show because no image load occur
        if(scope['slide'+slideTo].imageSource==goingToSlide.imageSourceToBeSet || goingToSlide.imageSourceToBeSet=='//:0'){
          scope['slide'+slideTo].imageSource = goingToSlide.imageSourceToBeSet;
          $timeout(function(){
            swapSlideAB(scope);
          }, 0);
        }
        else{
          scope['slide'+slideTo].imageSource = goingToSlide.imageSourceToBeSet;
        }
      }, 50);

    }, 0);
  }

  // go to left or right slide (previous or next)
  var goToSlide = function(scope, goingToSlideIndex, previousOrNext){
    if(skipAnimationOnNext){
      console.log('skip animation');
      $('.slide-A').removeClass('tran-animation');
      $('.slide-B').removeClass('tran-animation');
      skipAnimationOnNext = false;
      $timeout.cancel(waitForAnimation);
      return;
    }
    scope.goingToSlideIndex = goingToSlideIndex;
    var transitionClass = null;
    if(previousOrNext=='next'){
      transitionClass = getTransitionClass(scope, scope.currentSlideIndex);
    }
    else{
      transitionClass = getTransitionClass(scope, scope.goingToSlideIndex);
    }
    var goingToSlide = prepareGoingToSlideHash(scope, scope.goingToSlideIndex);

    applyGoingToSlide(scope, goingToSlide, previousOrNext, transitionClass);
    scope.currentSlideIndex = scope.goingToSlideIndex;
  }

  var previousSlide = function(scope, $event){
    if (scope.currentSlideIndex==0) return;

    goToSlide(scope, (scope.currentSlideIndex+scope.presentation_slides.length-1)%(scope.presentation_slides.length), 'previous');
  }

  var nextSlide = function(scope, $event){
    goToSlide(scope, (scope.currentSlideIndex+1)%(scope.presentation_slides.length), 'next');
  }

  var endSlide = function(scope){
    scope.showCover = false;
    scope.slideImageSourceForCache = [];
    $('#showPresentationViewerModal').modal('hide');
  }

  var initHotspot = function(slideId, x, y, width, height){
    var imageFromParent = {x:$('#'+slideId)[0].offsetLeft, y: $('#'+slideId)[0].offsetTop};
    var imageFromClient = {x:$('#'+slideId)[0].x, y: $('#'+slideId)[0].y};
    var imageSize = {w: $('#'+slideId)[0].width, h: $('#'+slideId)[0].height};

    if(x!=null && y!=null && width!=null && height!=null){
      $('#'+slideId+'Hotspots').css('top', imageFromParent.y+y*imageSize.h);
      $('#'+slideId+'Hotspots').css('height', height*imageSize.h);
      $('#'+slideId+'Hotspots').css('left', imageFromParent.x+x*imageSize.w);
      $('#'+slideId+'Hotspots').css('width', width*imageSize.w);
    }
    else{
      $('#'+slideId+'Hotspots').css('top', imageFromParent.y);
      $('#'+slideId+'Hotspots').css('height', imageSize.h);
      $('#'+slideId+'Hotspots').css('left', imageFromParent.x);
      $('#'+slideId+'Hotspots').css('width', imageSize.w);
    }
  }

  return {
    transitionTypes: transitionTypes,
    transitionSpeeds: transitionSpeeds,
    getSlideImageSource: getSlideImageSource,
    getSlideThumbnailSource: getSlideThumbnailSource,
    getImageSource: getImageSource,
    getThumbnailSource: getThumbnailSource,
    getImageOrientation: getImageOrientation,
    startPresentation: startPresentation,
    startSlide: startSlide,
    previousSlide: previousSlide,
    nextSlide: nextSlide,
    endSlide: endSlide
  }
});