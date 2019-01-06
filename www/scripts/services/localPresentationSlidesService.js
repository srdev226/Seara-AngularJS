angular.module('searaClientApp')
  .factory('LocalPresentationSlidesService', function($q, GlobalService, AuthService, localStorageService, LocalPathService){
  //*********** mimic rails controller logic **********

  var localContentPath = LocalPathService.localContentPath;
  var localDataPath = LocalPathService.localDataPath;

  var localAssetToPresentation;
  var localAsset;
  var localSlideIndex;

  var set_presentation = function(presentation, assetId){
    localAsset=null;
    localSlideIndex=-1;
    localAssetToPresentation  = localStorageService.get('localAssetToPresentation');
    localAsset = localAssetToPresentation[''+assetId];
  }

  var set_presentation_slide = function(presentationSlide, presentation, assetId){
    set_presentation(presentation, assetId);
    // why didn't I use plural form on this object name...... orz
    // localAssetToPresentation[ localAsset[ localPresentation, localPresentationSlides[ localPresentationSlide ] ] ]
    if(localAsset){
      for(var ii=0; ii<localAsset.presentation_slides.length; ii++){
        if(localAsset.presentation_slides[ii].id===presentationSlide.id){
          localSlideIndex = ii;
        }
      }
    }
  }

  var action_create_bulk = function(selectedAssets, presentationSlide, presentation, assetId, file_version){
    set_presentation(presentation, assetId);
    if(!localAsset) return false;

    var localSlideToContent = localStorageService.get('localSlideToContent');

    var last_position = localAsset.presentation.last_position;
    var maxId = 0;
    for(var key in localSlideToContent){
      var numberKey = parseInt(key.replace('localSlide', ''));
      if(numberKey>maxId) maxId = numberKey;
    }

    selectedAssets.forEach(function(asset){
      var content_id = null;
      var localFavoritesList = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesList');

      for(var ii=0; ii<localFavoritesList.length; ii++){
        if(localFavoritesList[ii].source_asset_id===asset.id || localFavoritesList[ii].favorite_asset_id===asset.id){
          content_id = localFavoritesList[ii].content_id;
        }
      }

      last_position = last_position + 1;
      maxId = maxId+1;

      var presentation_slide = {
        'id': 'localSlide'+maxId,
        'position': last_position,
        'transition_type': presentationSlide.transition_type,
        'transition_speed': presentationSlide.transition_speed,
        'content_id': content_id,
        'asset_name': asset.name,
        'presentation_id': presentation.id,
        'pending': true
      };

      localAsset.presentation_slides.push(presentation_slide);
      localSlideToContent['localSlide'+maxId] = ''+content_id;
    });

    localAsset.presentation.file_version = file_version || (''+(new Date()).getTime());

    localAsset.presentation.last_position = last_position;

    localStorageService.set('localAssetToPresentation', localAssetToPresentation);
    localStorageService.set('localSlideToContent', localSlideToContent);

    return true;
  }

  var action_update = function(presentationSlide, presentation, assetId, file_version){
    set_presentation_slide(presentationSlide, presentation, assetId);
    if(localSlideIndex===-1) return false;

    //rearranged slide position
    var current_position = localAsset.presentation_slides[localSlideIndex].position;
    if(presentationSlide.position!==undefined && presentationSlide.position!=current_position){
      var new_position = presentationSlide.position;
      if(current_position<new_position){
        for(var ii=0; ii<localAsset.presentation_slides.length; ii++){
          if(localAsset.presentation_slides[ii].position>current_position && localAsset.presentation_slides[ii].position<=new_position){
            localAsset.presentation_slides[ii].position = localAsset.presentation_slides[ii].position-1; // move back
          }
        }
      }
      else{
        for(var ii=0; ii<localAsset.presentation_slides.length; ii++){
          if(localAsset.presentation_slides[ii].position<current_position && localAsset.presentation_slides[ii].position>=new_position){
            localAsset.presentation_slides[ii].position = localAsset.presentation_slides[ii].position+1; // move forth
          }
        }
      }
    }

    if(presentationSlide.asset_name!==undefined && (presentationSlide.asset_name==='' || presentationSlide.asset_name===null)){
      GlobalService.deleteKey(presentationSlide, 'asset_name');
    }
    // before_save
    verify_transition(presentationSlide);

    // save
    var permitParams = ['transition_type', 'transition_speed', 'position', 'asset_name'];
    permitParams.forEach(function(paramName){
      if(presentationSlide[paramName]!==undefined){
        localAsset.presentation_slides[localSlideIndex][paramName] = presentationSlide[paramName];
      }
    });

    localAsset.presentation.file_version = file_version || (''+(new Date()).getTime());

    localStorageService.set('localAssetToPresentation', localAssetToPresentation);

    return true;
  }

  var action_destroy = function(presentationSlide, presentation, assetId, file_version){
    set_presentation_slide(presentationSlide, presentation, assetId);
    if(localSlideIndex===-1) return false;

    var localSlideToContent = localStorageService.get('localSlideToContent');

    GlobalService.deleteKey(localSlideToContent, ''+localAsset.presentation_slides[localSlideIndex].id);
    localAsset.presentation_slides.splice(localSlideIndex, 1);

    // after_destroy
    ensure_position_start_at_1(localAsset.presentation_slides);

    localAsset.presentation.file_version = file_version || (''+(new Date()).getTime());

    localStorageService.set('localAssetToPresentation', localAssetToPresentation);
    localStorageService.set('localSlideToContent', localSlideToContent);

    return true;
  }

  function verify_transition(presentationSlide){
    if(['none', 'fade', 'zoom', 'move'].indexOf(presentationSlide.transition_type)==-1){
      presentationSlide.transition_type = 'none';
    }
    if(['slow', 'medium', 'fast'].indexOf(presentationSlide.transition_speed)==-1){
      presentationSlide.transition_speed = 'medium';
    }

    if(presentationSlide.transition_type=='none'){
      presentationSlide.transition_speed = null;
    }
    return presentationSlide;
  }

  function ensure_position_start_at_1(presentation_slides){
    if(presentation_slides.length>0){
      var firstSlideIndex = 0;
      var position = Number.MAX_SAFE_INTEGER;
      for(var ii=0; ii<presentation_slides.length; ii++){
        if(presentation_slides[ii].position<position){
          firstSlideIndex = ii;
          position = presentation_slides[ii].position;
        }
      }
      presentation_slides[firstSlideIndex].position = 1;
    }
  }

  return {
    action_create_bulk: action_create_bulk,
    action_update: action_update,
    action_destroy: action_destroy
  };
});