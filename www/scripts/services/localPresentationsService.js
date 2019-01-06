angular.module('searaClientApp')
  .factory('LocalPresentationsService', function($q, GlobalService, AuthService, localStorageService, LocalPathService){

  var localContentPath = LocalPathService.localContentPath;
  var localDataPath = LocalPathService.localDataPath;

  var action_create = function(presentationName){
    var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');
    var localAssetToPresentation = localStorageService.get('localAssetToPresentation');

    for(var ii=0; ii<localPresentationsFolder.assets.length; ii++){
      if(localPresentationsFolder.assets[ii].name===''+presentationName){
        return {'success': false, 'error_type': 'duplicated_name'};
      }
    }
    if(presentationName.match(/^[a-z0-9()\s]+$/i)===null){
      return {'success': false, 'error_type': 'invalid_name'};
    }

    var presentationMaxId = 0;
    var assetMaxId = 0;

    for(var key in localAssetToPresentation){
      var numberPresentationId = localAssetToPresentation[key].presentation.id;
      if((typeof numberPresentationId)!='number'){
        numberPresentationId = parseInt(numberPresentationId.replace('localPresentation', ''));
      }
      if(numberPresentationId>presentationMaxId){
        presentationMaxId = numberPresentationId;
      }
      var numberAssetId = key;
      if((typeof numberAssetId)!='number'){
        numberAssetId = parseInt(key.replace('localAsset', ''));
      }
      if(numberAssetId>assetMaxId){
        assetMaxId = numberAssetId;
      }
    }

    var timestamp = ''+(new Date()).getTime();
    var presentation = {
      'id': 'localPresentation'+(presentationMaxId+1),
      'title': presentationName,
      'description': '',
      'last_position': 0,
      'owner_id': AuthService.currentUser.user_id,
      'shared': false,
      'asset_id': 'localAsset'+(assetMaxId+1),
      'file_version': timestamp,
      'logo_asset_id': null,
      'pending': true
    };

    var asset = {
      'id': 'localAsset'+(assetMaxId+1),
      'name': presentationName,
      'assetable_type': 'Presentation',
      'assetable_id': presentation.id,
      'path': localPresentationsFolder.currentFolder.path+'/'+presentationName,
      'pending': true,
      'presentation': {
        'description': '',
        'shared': false,
        'file_version': timestamp
      }
    };

    localPresentationsFolder.assets.push(asset);
    localPresentationsFolder.currentFolder.folder_version = timestamp;
    localStorageService.set(AuthService.currentUser.user_id+'_localPresentationsFolder', localPresentationsFolder);

    localAssetToPresentation[''+asset.id] = { 'presentation': presentation, 'presentation_slides': [] };
    localStorageService.set('localAssetToPresentation', localAssetToPresentation);

    return { 'success': true, 'presentation': presentation, 'presentation_slides': [] };
  }

  var action_asset_update = function(presentation, assetId){
    var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');
    var localAssetToPresentation = localStorageService.get('localAssetToPresentation');

    for(var ii=0; ii<localPresentationsFolder.assets.length; ii++){
      if(localPresentationsFolder.assets[ii].name===''+presentation.name && localPresentationsFolder.assets[ii].id!==assetId){
        return {'success': false, 'error_type': 'duplicated_name'};
      }
    }
    if(presentation.name.match(/^[a-z0-9()\s]+$/i)===null){
      return {'success': false, 'error_type': 'invalid_name'};
    }

    var assetIndex = null;
    for(var ii=0; ii<localPresentationsFolder.assets.length; ii++){
      if(localPresentationsFolder.assets[ii].id===assetId){
        assetIndex = ii;
        break;
      }
    }

    if(assetIndex===null){
      return {'success': false};
    }

    var permitParams = ['name'];
    permitParams.forEach(function(paramName){
      if(presentation[paramName]!==undefined){
        localPresentationsFolder.assets[assetIndex][paramName] = presentation[paramName];
      }
    });

    localPresentationsFolder.assets[assetIndex].path = localPresentationsFolder.currentFolder.path+'/'+presentation.name;
    localPresentationsFolder.currentFolder.folder_version = ''+(new Date()).getTime();

    localStorageService.set('localAssetToPresentation', localAssetToPresentation);
    localStorageService.set(AuthService.currentUser.user_id+'_localPresentationsFolder', localPresentationsFolder);

    return {'success': true, 'asset': localPresentationsFolder.assets[assetIndex]};
  }

  var action_update = function(presentation, assetId, timestamp){
    var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');
    var localAssetToPresentation = localStorageService.get('localAssetToPresentation');

    if(!localAssetToPresentation.hasOwnProperty(''+assetId)){
      return {'success': false};
    }

    var permitParams = ['title', 'description', 'file_version', 'id', 'last_position', 'logo_asset_id', 'logo_content_id', 'logo_content_file_version', 'name', 'owner_id'];
    permitParams.forEach(function(paramName){
      if(presentation[paramName]!==undefined){
        localAssetToPresentation[''+assetId].presentation[paramName] = presentation[paramName];
      }
    });

    if(!timestamp){
      timestamp =  ''+(new Date().getTime());
    }

    localAssetToPresentation[''+assetId].presentation.file_version = timestamp;
    localStorageService.set('localAssetToPresentation', localAssetToPresentation);

    return {'success': true, 'presentation': localAssetToPresentation[''+assetId].presentation, 'presentation_slides': localAssetToPresentation[''+assetId].presentation_slides };
  }

  var action_destroy = function(assetId){
    var localPresentationsFolder = localStorageService.get(AuthService.currentUser.user_id+'_localPresentationsFolder');
    var localAssetToPresentation = localStorageService.get('localAssetToPresentation');

    var assetIndex = null;
    for(var ii=0; ii<localPresentationsFolder.assets.length; ii++){
      if(localPresentationsFolder.assets[ii].id===assetId){
        assetIndex = ii;
      }
    }

    if(assetIndex===null){
      return {'success': false};
    }

    var timestamp = ''+(new Date().getTime());

    if(localPresentationsFolder.assets[assetIndex]['pending']){
      var localSlideToContent = localStorageService.get('localSlideToContent');
      localAssetToPresentation[''+assetId].presentation_slides.forEach(function(presentation_slide){
        GlobalService.deleteKey(localSlideToContent, ''+presentation_slide.id);
      });
      localStorageService.set('localSlideToContent', localSlideToContent);

      localPresentationsFolder.assets.splice(assetIndex, 1);
      GlobalService.deleteKey(localAssetToPresentation, ''+assetId);

    }
    else{
      localPresentationsFolder.assets[assetIndex]['deleted'] = timestamp;
    }

    localPresentationsFolder.currentFolder.folder_version = timestamp;

    localStorageService.set('localAssetToPresentation', localAssetToPresentation);
    localStorageService.set(AuthService.currentUser.user_id+'_localPresentationsFolder', localPresentationsFolder);

    return {'success': true, 'asset': localPresentationsFolder.assets[assetIndex]};
  }

  return {
    action_create: action_create,
    action_asset_update: action_asset_update,
    action_update: action_update,
    action_destroy: action_destroy
  };
});