'use strict';

angular.module('searaClientApp')
  .controller('PresentationEditCtrl',function( $scope, $rootScope, $routeParams, $q, $timeout, $location, FileSyncService, localStorageService, GlobalService, FolderService, AuthService, $interval, PresentationService, PresentationSyncService) {

    assetBrowserDialog.call(this, $scope, $rootScope, $q, 'image', AuthService, FolderService, FileSyncService, GlobalService, localStorageService);

    $rootScope.titleName = '';
    $scope.fixedDialogTitleName = 'Add New Slide(s) To Presentation';

    var proxyRequest = GlobalService.proxyRequest;
    var token = AuthService.authToken;

    $scope.presentation = {};

    $scope.maxSlides = 20;
    $scope.transitionTypes = ['none'].concat(PresentationService.transitionTypes);
    $scope.transitionSpeeds = PresentationService.transitionSpeeds;
    $scope.imageSource = undefined;// GlobalService.apiUrl+'presentation_slides/default_image?auth_token='+token; 

    var assetId = $routeParams.id;    
    $scope.currentDialogPath = undefined;
    var random; //for reloading images

    var waitForImg;

    $scope.scrollLeft = function(event){
      if(typeof event.preventDefault !== 'undefined') event.preventDefault();
      var distance = 200;
      if($('.item.presentation-slide').width()){
        distance = $('.item.presentation-slide').width();
      }
      $('.slide-list').scrollLeft($('.slide-list').scrollLeft() - distance);
    } 

    $scope.scrollRight = function(event){
      if(typeof event.preventDefault !== 'undefined') event.preventDefault();
      var distance = 200;
      if($('.item.presentation-slide').width()){
        distance = $('.item.presentation-slide').width();
      }
      $('.slide-list').scrollLeft($('.slide-list').scrollLeft() + distance);
    }

    // $scope.scrollRight = function(){
    //   $(".slide-list").animate({
    //       scrollLeft: "+=200"
    //   },1000);
    // } 

    $scope.getSlideImageSource = function(presentationSlideId){
      return FolderService.getSlideImageSource(presentationSlideId);
    }

    $scope.getSlideThumbnailSource = function(presentationSlideId){
      return FolderService.getSlideThumbnailSource(presentationSlideId);
    }
    $scope.setPresentation = function(){
      var deferred = $q.defer();

      var presentationDeferred = $q.defer();

      $scope.imageSource = undefined;
      GlobalService.showLoadingMask();
      $scope.presentationLoading = true;
      $scope.showHotspot = false;

      if(window.useLocalStorage){
        //call sync and get presentation, slides data and update assetId
        PresentationSyncService.syncAndGetPresentation(assetId).then(
          function(data){
            presentationDeferred.resolve(data);
            if(data.asset_id) assetId = data.asset_id;
          },
          function(message){
            console.log(message);
            presentationDeferred.reject();
          }
        );
      }
      else{
        proxyRequest(
          'presentations/'+assetId+'?auth_token='+token,
          'GET'
        )
        .success(function(data, status){
          presentationDeferred.resolve(data);
        })
        .error(function(){
          presentationDeferred.reject();
        });
      }
        

      presentationDeferred.promise.then(function(data){
        random = Math.random();
        $scope.presentation = data.presentation;
        $rootScope.titleName = $scope.presentation.title || $scope.presentation.name;
        //sort by position
        $scope.list_presentation_slides = data.presentation_slides;
        // $scope.list_presentation_slides = data.presentation_slides.sort(function(slideA,slideB){
        //   return slideA.position>slideB.position;
        // });

        //map position field into sequence 
        $scope.positionList = [];
        var i=1;

        $scope.list_presentation_slides.forEach(function(slide){
          //key is position, value is index, easier to find index when edit position(i think..), both key and value are string
          $scope.positionList.push({index: i++, position: slide.position});
        });
        if($scope.selectedPresentationSlideIndex==='last'){ // specific to last
          $scope.selectSlide($scope.list_presentation_slides.length-1);

        }
        if($scope.selectedPresentationSlide){ //already select one
          var index = 0;
          for(var ii=0; ii<$scope.list_presentation_slides.length; ii++){
            if($scope.selectedPresentationSlide.id==$scope.list_presentation_slides[ii].id){
              index = ii;
              break;
            }
          }
          $scope.selectSlide(index);
        }
        else{
            $scope.selectSlide(0); //first enter the page, default slide[0]
            $scope.selectedPresentationSlideIndex = 0;
        }

        var idx = 0;
        $scope.thumbnailSource = [];
        $scope.list_presentation_slides.forEach(function(slide){
          $scope.thumbnailSource[idx++] = $scope.getSlideThumbnailSource(slide.id);
        });
        $scope.presentationLoading = false;
        
        GlobalService.hideLoadingMask();
        deferred.resolve();
      },
        //presentationDeferred got rejected
      function(){
        GlobalService.showSimpleDialog('Cannot get presentation data', 'Please try again');
        GlobalService.hideLoadingMask();
        deferred.reject();
        $location.path('/presentations/index/root');
      });


      return deferred.promise;
    }

    $scope.selectSlide = function(slideIndex){
      //if current slide has been destroyed
      $scope.showHotspot = false;
      if(!$scope.list_presentation_slides[slideIndex]) slideIndex = 0;
      //if no slide
      if(!$scope.list_presentation_slides[slideIndex]){
        //put placeholder in later
        $scope.imageSource =  undefined; //GlobalService.apiUrl+'presentation_slides/default_image?auth_token='+token; 
        return;
      }

      $timeout(function(){
        $('.selected-slide-border').removeClass('selected-slide-border');
      },0).then(function(){
        document.getElementById('slideItem'+slideIndex).scrollIntoView();
        $('#slideBorder'+slideIndex).addClass('selected-slide-border');
      });
      $scope.selectedPresentationSlide = JSON.parse(JSON.stringify($scope.list_presentation_slides[slideIndex]));
      $scope.imageLoading=true;
      $timeout(function(){
        if($scope.imageLoading && !$('#previewImage').complete){
          $scope.showLoading=true;
        }
      },200);
      var imgSrc = $scope.getSlideImageSource($scope.selectedPresentationSlide.id);
      var promise = FolderService.getImageOrientation($scope.selectedPresentationSlide.image_width, $scope.selectedPresentationSlide.image_height, '.show-image');
      promise.then(function(orientation){
        if(orientation=='no_image'){
          $scope.imageLoading=false;
          $scope.showLoading=false;
          $scope.imageOrientation = null;
          $scope.imageSource = null;
        }
        else{
          $scope.imageOrientation = orientation;
          $scope.imageSource = imgSrc;
        }
        waitForImg = $q.defer();
        waitForImg.promise.then(function(){
          // initHotspot();
        });
      });
    }

    $('.show-image img').load(function(){
      $scope.imageLoading=false;
      $scope.showLoading=false;
    });
    $('#previewImage').load(function(){
      waitForImg.resolve();
    });

    $scope.setSelectedAsset = function(asset){
      //if add new slide presentationSlide will exist
      if($scope.presentationSlide){
        $scope.presentationSlide.asset_id = asset.id;
        $scope.presentationSlide.asset_name = asset.name;
      }
      //but if edit slide selectedPresentationSlide will exist, find a better way later
      if($scope.selectedPresentationSlide){
        $scope.selectedPresentationSlide.asset_id = asset.id;
        $scope.selectedPresentationSlide.asset_name = asset.name;
      }

    }

    $scope.showAddPresentationSlideDialog = function(){
      $scope.presentationSlide = { presentation_id: $scope.presentation.id, transition_type:'fade', transition_speed: 'medium' };
      $scope.selectedAssets = [];
      $('#addPresentationSlideModal').modal('show');
    }

    $scope.showPresentationSlideOptionsDialog = function(){
      $('#presentationSlideOptionsModal').modal('show');
    }

    $scope.showEditPresentationSlideDialog = function(){
      $('#editPresentationSlideModal').modal('show');
    }

    $scope.showConfirmDeletePresentationSlideDialog = function(){
      $('#confirmDeletePresentationSlideModal').modal('show');
    }

    $scope.showEditTransitionDialog = function(){
      $('#editTransitionModal').modal('show');
    }

    $scope.showEditPresentationDialog = function(){
      $scope.editPresentationModel = JSON.parse(JSON.stringify($scope.presentation));
      $scope.logoFileName = '';
      $('.file-upload-browser input[type=file]').val(null);

      $('#editPresentationModal').modal('show');
    }


    // $scope.addPresentationSlide = function(){
    //   GlobalService.showLoadingMask();      
    //   proxyRequest(
    //     'presentation_slides?auth_token='+token,
    //     'POST',
    //     $scope.presentationSlide
    //   )
    //   .success(function(data, status){
    //     $scope.selectedPresentationSlideIndex = $scope.list_presentation_slides.length;

    //     $scope.setPresentation();
    //     $('#addPresentationSlideModal').modal('hide');
    //     GlobalService.hideLoadingMask();
    //   })
    //   .error(function(){
    //     GlobalService.hideLoadingMask();
    //   });
    // }

    $scope.addPresentationSlides = function(){
      if($scope.selectedAssets.length==0) return;
      GlobalService.showLoadingMask();
      PresentationSyncService.addPresentationSlides(
        $scope.selectedAssets, 
        {
          'presentation_id': $scope.presentationSlide.presentation_id,
          'transition_type': $scope.presentationSlide.transition_type,
          'transition_speed': $scope.presentationSlide.transition_speed
        },
        $scope.presentation, assetId
      ).then(
        function(){
          $scope.selectedPresentationSlideIndex = 'last';
          $scope.setPresentation();
          $('#addPresentationSlideModal').modal('hide');
          GlobalService.hideLoadingMask();
        },
        function(message){
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    $scope.onLogoSelect = function(files){
      if(files.length>0){
        if(!files[0].type.match(/png|jpeg/)){
          GlobalService.showSimpleDialog('Please select PNG or JPG file');
          return;
        }
        if(files[0].size>1*1024*1024){
          GlobalService.showSimpleDialog('File size cannot exceed 1 MB');
          return;
        }
                
        $scope.logoFile = files[0];
        // $scope.progress[0] = -1;
        $scope.logoFileName = files[0].name;
      }
    }


    $scope.editPresentation = function(){
      GlobalService.showLoadingMask();
      PresentationSyncService.editPresentation($scope.editPresentationModel, $scope.logoFile, $scope.presentation.asset_id).then(
        function(data){
          $scope.presentation = data.presentation;
          $rootScope.titleName = $scope.presentation.title || $scope.presentation.name;
          $('#editPresentationModal').modal('hide');
          GlobalService.hideLoadingMask();
        },
        function(message){
          console.log('Edit Presentation failed');
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }
    
    $scope.editPresentationSlide = function(){
      GlobalService.showLoadingMask();
      PresentationSyncService.editPresentationSlide($scope.selectedPresentationSlide, $scope.presentation, assetId).then(
        function(){
          $scope.setPresentation().then(function(){
            // reselect current slide
            var index = 0;
            for(var ii=0; ii<$scope.list_presentation_slides.length; ii++){
              if($scope.selectedPresentationSlide.id==$scope.list_presentation_slides[ii].id){
                index = ii;
                break;
              }
            }
            $scope.selectSlide(index);
          });
          $('#editPresentationSlideModal').modal('hide');
          GlobalService.hideLoadingMask();
        },
        function(message){
          console.log('Edit Presentation Slide failed');
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    $scope.editTransition = function(){
      GlobalService.showLoadingMask();
      PresentationSyncService.editTransition(
        {
          id: $scope.selectedPresentationSlide.id,
          transition_type: $scope.selectedPresentationSlide.transition_type,
          transition_speed: $scope.selectedPresentationSlide.transition_speed
        },
        $scope.presentation, assetId
      )
      .then(
        function(){
          $scope.setPresentation();
          $('#editTransitionModal').modal('hide');
          GlobalService.hideLoadingMask();
        },
        function(message){
          console.log('Edit Transition failed');
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );

    }

    $scope.deletePresentationSlide = function(){
      GlobalService.showLoadingMask();
      
      PresentationSyncService.deletePresentationSlide($scope.selectedPresentationSlide, $scope.presentation, assetId).then(
        function(data, status){
          $scope.setPresentation();
          $('#confirmDeletePresentationSlideModal').modal('hide');
          GlobalService.hideLoadingMask();
        },
        function(message){
          console.log('Delete Presentation Slide failed');
          if(message) GlobalService.showSimpleDialog(message);
          GlobalService.hideLoadingMask();
        }
      );
    }

    $scope.setTransitionSpeed = function(model, speed){
      model.transition_speed = speed;
    }
    
    $scope.selectedPresentationSlide;
    var promise;
    $scope.selectedPresentationSlideIndex = -1;      
    $scope.shakePresentationSlideIndex = -1;      

    $scope.slideMouseDown = function(index){
      
      $scope.holdingTimeSec = 1;
      //customize wiggle time
      $scope.holdingTime = $scope.holdingTimeSec*10;
      $interval.cancel(promise);
      promise = $interval(function () { 
        $scope.holdingTime -= 1;
        if($scope.holdingTime<=6){
          $scope.shakePresentationSlideIndex = index;
        } 
        if($scope.holdingTime<=0){
          $scope.shakePresentationSlideIndex = -1;
          $scope.showPresentationSlideOptionsDialog();
          $interval.cancel(promise);
          $scope.focusSlide(index);
        }
      }, 100); //T
    }

    $scope.slideMouseUp = function(index){
      if(promise && $scope.holdingTime>0) {
        $scope.focusSlide(index);

      }

      $scope.shakePresentationSlideIndex = -1;
      $interval.cancel(promise);
    }

    $scope.slideMouseMove = function(){
      $scope.shakePresentationSlideIndex = -1;
      $scope.holdingTime=0;
      $interval.cancel(promise);
    }

    $scope.focusSlide = function(index){
        $scope.selectedPresentationSlide = JSON.parse(JSON.stringify($scope.list_presentation_slides[index])); //clone object so the current detail don't follow the modified one
      //have to do this to make the current position get selected in edit dialog for now...
      $scope.selectedPresentationSlide.position = $scope.selectedPresentationSlide.position;
      if(index!=$scope.selectedPresentationSlideIndex){
        $scope.selectSlide(index);
      }

      $scope.selectedPresentationSlideIndex = index;
    
      //might also render transition when click change slide
    }
    
    $scope.transitionMouseUp = function(index){
      $scope.selectedPresentationSlide = JSON.parse(JSON.stringify($scope.list_presentation_slides[index]));
      $scope.selectedPresentationSlideIndex = index;
      $scope.selectSlide(index);
      $scope.showEditTransitionDialog();
    }

    $scope.startPresentation = function(){
      FolderService.startPresentation($scope, assetId);
    }

    $scope.previousSlide = function(){
      FolderService.previousSlide($scope);
    }

    $scope.nextSlide = function($event){
      FolderService.nextSlide($scope, $event);
    }

    $scope.endSlide = function(){
      FolderService.endSlide($scope);
    }

    var imageFromParent;
    var imageFromClient;
    var imageSize;
    var updateImageObject = function(){
      imageFromParent = {x:$('#previewImage')[0].offsetLeft, y: $('#previewImage')[0].offsetTop};
      // imageFromClient = {x:$('#previewImage')[0].x, y: $('#previewImage')[0].y}; //not working on firefox
      var elem = $('#previewImage')[0];
      var tempTop = 0, tempLeft = 0;
      while(elem){
        tempTop = tempTop + parseInt(elem.offsetTop);
        tempLeft = tempLeft + parseInt(elem.offsetLeft);
        elem = elem.offsetParent;
      }
      imageFromClient = {x: tempLeft, y: tempTop};

      imageSize = {w: $('#previewImage')[0].width, h: $('#previewImage')[0].height};
      hotspotSize = {w: $('.hotspot').width(), h: $('.hotspot').height()};hotspotSize = {w: $('.hotspot').width(), h: $('.hotspot').height()};
    }

    var hotspotSize;
    var absHotspotOffset;
    var draggingId = null;

    $scope.startDrag = function(divId){
      updateImageObject();
      absHotspotOffset = {x: imageFromClient.x-imageFromParent.x+hotspotSize.w/2, y: imageFromClient.y-imageFromParent.y+hotspotSize.h/2};
      
      draggingId = divId;

    }

    $scope.stopDrag = function(){
      if(draggingId) {
        $scope.editHotspots();
      }
      draggingId = null;  

    }
    $(document).on('mouseup touchend', function(){
      $scope.stopDrag();

    }); 

    var initHotspot = function(){
      updateImageObject();
      //have slide selected and hotspots set already
      if($scope.selectedPresentationSlide && $scope.selectedPresentationSlide.hotspots_x!=null){
        var selPS = $scope.selectedPresentationSlide;
        $('#hotspotBox').css('top', imageFromParent.y+selPS.hotspots_y*imageSize.h-hotspotSize.h/2);
        $('#hotspotBox').css('height', selPS.hotspots_height*imageSize.h+hotspotSize.h);      
        $('#hotspotBox').css('left', imageFromParent.x+selPS.hotspots_x*imageSize.w-hotspotSize.w/2);      
        $('#hotspotBox').css('width', selPS.hotspots_width*imageSize.w+hotspotSize.w);      
      }
      else{
        $('#hotspotBox').css('top', imageFromParent.y+0.25*imageSize.h-hotspotSize.h/2);
        $('#hotspotBox').css('height', imageSize.h/2+hotspotSize.h);      
        $('#hotspotBox').css('left', imageFromParent.x+0.25*imageSize.w-hotspotSize.w/2);      
        $('#hotspotBox').css('width', imageSize.w/2+hotspotSize.w);      
      }
      $scope.showHotspot = true;
    }

    var boundInside = function(value, minValue, maxValue){
      return Math.min(Math.max(value,minValue),maxValue);
    }

    $scope.moveHotspot = function($event){
      if(draggingId){
        switch (draggingId){
          case 'hotspotTL':
            var top = $('#hotspotBox')[0].offsetTop;
            var left = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').css('top', boundInside($event.clientY-absHotspotOffset.y, imageFromParent.y-hotspotSize.h/2, $('#hotspotBox')[0].offsetTop+$('#hotspotBox').height()-2*hotspotSize.h));
            $('#hotspotBox').css('left', boundInside($event.clientX-absHotspotOffset.x, imageFromParent.x-hotspotSize.w/2, $('#hotspotBox')[0].offsetLeft+$('#hotspotBox').width()-2*hotspotSize.w));
            var newTop = $('#hotspotBox')[0].offsetTop;
            var newLeft = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').height($('#hotspotBox').height()-newTop+top);
            $('#hotspotBox').width($('#hotspotBox').width()-newLeft+left);
            break;
          case 'hotspotTR':
            var top = $('#hotspotBox')[0].offsetTop;
            var left = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').css('top', boundInside($event.clientY-absHotspotOffset.y, imageFromParent.y-hotspotSize.h/2, $('#hotspotBox')[0].offsetTop+$('#hotspotBox').height()-2*hotspotSize.h));
            var newTop = $('#hotspotBox')[0].offsetTop;
            $('#hotspotBox').height($('#hotspotBox').height()-newTop+top);
            $('#hotspotBox').width(boundInside($event.clientX-absHotspotOffset.x-left, 2*hotspotSize.w, imageSize.w+imageFromParent.x-left-hotspotSize.w/2));
            break;
          case 'hotspotBL':
            var top = $('#hotspotBox')[0].offsetTop;
            var left = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').css('left', boundInside($event.clientX-absHotspotOffset.x, imageFromParent.x-hotspotSize.w/2, $('#hotspotBox')[0].offsetLeft+$('#hotspotBox').width()-2*hotspotSize.w));
            var newLeft = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').height(boundInside($event.clientY-absHotspotOffset.y-top, 2*hotspotSize.h, imageSize.h+imageFromParent.y-top-hotspotSize.h/2));
            $('#hotspotBox').width($('#hotspotBox').width()-newLeft+left);
            break;
          case 'hotspotBR':
            var top = $('#hotspotBox')[0].offsetTop;
            var left = $('#hotspotBox')[0].offsetLeft;
            $('#hotspotBox').height(boundInside($event.clientY-absHotspotOffset.y-top, 2*hotspotSize.h, imageSize.h+imageFromParent.y-top-hotspotSize.h/2));
            $('#hotspotBox').width( boundInside($event.clientX-absHotspotOffset.x-left, 2*hotspotSize.w, imageSize.w+imageFromParent.x-left-hotspotSize.w/2));
            break;
          default: //hotspotBox
            $('#hotspotBox').css('top', boundInside($event.clientY-absHotspotOffset.y-$('#hotspotBox').height()/2, imageFromParent.y-hotspotSize.h/2, imageFromParent.y+imageSize.h-$('#hotspotBox').height()-hotspotSize.h/2));
            $('#hotspotBox').css('left', boundInside($event.clientX-absHotspotOffset.x-$('#hotspotBox').width()/2, imageFromParent.x-hotspotSize.w/2, imageFromParent.x+imageSize.w-$('#hotspotBox').width()-hotspotSize.w/2));
        }
      }
    }

    //editHotspots will initialize hotspots if not have been set
    //hotspots box exists but will be hidden if hotspots_x is null
    $scope.editHotspots = function(){
      GlobalService.showLoadingMask();
      
      var box = $('#hotspotBox');
      var boxPos = {x:box[0].offsetLeft-imageFromParent.x+hotspotSize.w/2, y:box[0].offsetTop-imageFromParent.y+hotspotSize.h/2};
      var boxSize = {w: box.width(), h: box.height()};

      var hotspots;
      // console.log('hotspots!: '+($scope.selectedPresentationSlide.hotspots_x!=null));
      if($scope.selectedPresentationSlide.hotspots_x!=null){

        hotspots = {hotspots_x:boxPos.x/imageSize.w, hotspots_y:boxPos.y/imageSize.h, hotspots_width:boxSize.w/imageSize.w, hotspots_height:boxSize.h/imageSize.h};        
      }
      else{
        hotspots = {hotspots_x: 0.25, hotspots_y:0.25, hotspots_width:boxSize.w/imageSize.w, hotspots_height:boxSize.h/imageSize.h};        
      }

      // console.log('apply hotspots: '+JSON.stringify(hotspots));
      proxyRequest(
        'presentation_slides/'+$scope.selectedPresentationSlide.id+'/?auth_token='+token,
        'PUT',
        hotspots
      )
      .success(function(data, status){
        //key is position, value is index, set selected slide to destination index.... -1
        $scope.list_presentation_slides[$scope.selectedPresentationSlideIndex] = data.presentation_slide;
        $scope.selectSlide($scope.selectedPresentationSlideIndex);
        $('#editPresentationSlideModal').modal('hide');
        GlobalService.hideLoadingMask();
      })
      .error(function(){
        console.log('Edit PresentationSlide failed.');
        GlobalService.hideLoadingMask();
      });
    }

    $scope.deleteHotspots = function(){
      GlobalService.showLoadingMask();
      
      var hotspots = {hotspots_x:null, hotspots_y:null, hotspots_width:null, hotspots_height:null};
      
      proxyRequest(
        'presentation_slides/'+$scope.selectedPresentationSlide.id+'/?auth_token='+token,
        'PUT',
        hotspots
      )
      .success(function(data, status){
        //key is position, value is index, set selected slide to destination index.... -1
        $scope.selectedPresentationSlideIndex = $scope.positionList[''+($scope.selectedPresentationSlide.position-1)];
        //HAVE TO RELOAD EVERY SINGLE TIME???
        $scope.setPresentation();
        $('#editPresentationSlideModal').modal('hide');
        GlobalService.hideLoadingMask();
      })
      .error(function(){
        console.log('Edit PresentationSlide failed.');
        GlobalService.hideLoadingMask();
      });
    }

    $('.slide-list').ready(function(){
      if(!window.isTablet){
        // $('.slide-list').css('overflow-x', 'hidden');
      }
    });


    var titlebarRightButtons = [
      { functionToCall: "startPresentation", args: '()', iconClass: 'editor-full-screen-button', text: null },
      { functionToCall: "showEditPresentationDialog", args: '()', iconClass: 'editor-edit-presentation-button', text: null }
    ];
    $rootScope.setTitlebarRightButtons($scope, titlebarRightButtons);

});