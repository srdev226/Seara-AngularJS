angular.module('searaClientApp')
  .factory('LocalFavoritesService', function($q, GlobalService, AuthService, localStorageService, LocalPathService){

  var localContentPath = LocalPathService.localContentPath;
  var localDataPath = LocalPathService.localDataPath;

  var localFolder;
  var localAsset;
  var localFavoritesFolder;

  var set_folder = function(pathOrId){
    localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
    localFolder = null;
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      if((''+pathOrId).indexOf('/')!==-1){
        if(localFavoritesFolder.folders[ii].path.trim()===pathOrId.trim()){
          localFolder = localFavoritesFolder.folders[ii];
          break;
        }
      }
      else{
        if((''+localFavoritesFolder.folders[ii].id)===(''+pathOrId)){
          localFolder = localFavoritesFolder.folders[ii];
          break;
        }
      }
    }
  }

  var set_asset = function(assetId){
    localFavoritesFolder = localStorageService.get(AuthService.currentUser.user_id+'_localFavoritesFolder');
    localAsset = null;
    for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
      if((''+localFavoritesFolder.assets[ii].id)===(''+assetId)){
        localAsset = localFavoritesFolder.assets[ii];
        break;
      }
    }
  }

  var findRootFavoritesFolder = function(){
    var rootFavoritesFolder = null;
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      if(localFavoritesFolder.folders[ii].favorite_root==true){
        rootFavoritesFolder = localFavoritesFolder.folders[ii];
        break;
      }
    }
    return rootFavoritesFolder;
  }

  var findFavoritesFolderByPath = function(path){
    var folder = null;
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      if(localFavoritesFolder.folders[ii].path.trim()===path.trim()){
        folder = localFavoritesFolder.folders[ii];
        break;
      }
    }
    return folder;
  }

  var findFavoritesFolderById = function(id){
    var folder = null;
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      if((''+localFavoritesFolder.folders[ii].id)===(''+id)){
        folder = localFavoritesFolder.folders[ii];
        break;
      }
    }
    return folder;
  }

  var action_folder_create = function(addFolderParams, path){
    var timestamp = ''+(new Date()).getTime();
    set_folder(path);

    var addFolderName = addFolderParams.name;
    var viewType = addFolderParams.view_type;
    var assetOrderBy = addFolderParams.asset_order_by;

    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      var folder = localFavoritesFolder.folders[ii];
      if(''+folder.parent_id===''+localFolder.id && !folder.deleted && folder.name===''+addFolderName){
        return {'success': false, 'error_type': 'duplicated_name'};
      }
    }
    if(addFolderName.match(/^[a-z0-9()\s]+$/i)===null){
      return {'success': false, 'error_type': 'invalid_name'};
    }

    var folderMaxId = 0;

    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      var numberFolderId = localFavoritesFolder.folders[ii].id;
      if((typeof numberFolderId)!='number'){
        numberFolderId = parseInt(numberFolderId.replace('localFavFolder', ''));
      }
      if(numberFolderId>folderMaxId){
        folderMaxId = numberFolderId;
      }
    }

    var favFolder = {
      'asset_order_by': assetOrderBy,
      'creator_id': AuthService.currentUser.user_id,
      'folder_version': timestamp,
      'id': 'localFavFolder'+(folderMaxId+1),
      'locked': false,
      'name': addFolderName,
      'parent_id': localFolder.id,
      'path': localFolder.path+'/'+addFolderName,
      'permission': 'user',
      'view_type': viewType,
      'pending': true
    };

    localFavoritesFolder.folders.push(favFolder);

    var rootFavoritesFolder = findRootFavoritesFolder();

    rootFavoritesFolder.folder_version = timestamp;
    localFolder.folder_version = timestamp;
    localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);

    return { 'success': true, 'folder':{id: favFolder.id, name: favFolder.name, path: favFolder.path} };
  }

  var updateChildrenPath = function(folder){
    var subfolders = [];
    var subassets = [];
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      if(''+localFavoritesFolder.folders[ii].parent_id===''+folder.id){
        subfolders.push(localFavoritesFolder.folders[ii]);
      }
    }
    for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
      if(''+localFavoritesFolder.assets[ii].folder_id===''+folder.id){
        subassets.push(localFavoritesFolder.assets[ii]);
      }
    }
    for(var ii=0; ii<subassets.length; ii++){
      var subasset = subassets[ii];
      subasset.path = folder.path+'/'+subasset.name;
    }

    if(subfolders.length>0){
      for(var ii=0; ii<subfolders.length; ii++){
        var subfolder = subfolders[ii];
        subfolder.path = folder.path+'/'+subfolder.name;
        updateChildrenPath(subfolder);
      }
    }

    return;
  }

  var action_folder_update = function(editFolderParams, folderId){
    var timestamp = ''+(new Date()).getTime();
    set_folder(folderId);
    var rootFavoritesFolder = findRootFavoritesFolder();

    var editFolderName = editFolderParams.name;

    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      var folder = localFavoritesFolder.folders[ii];
      if(''+folder.id!==''+localFolder.id && !folder.deleted && ''+folder.parent_id===''+localFolder.parent_id && ''+folder.name===''+editFolderName){
        return {'success': false, 'error_type': 'duplicated_name'};
      }
    }
    if(editFolderName.match(/^[a-z0-9()\s]+$/i)===null){
      return {'success': false, 'error_type': 'invalid_name'};
    }

    var oldFolderName = localFolder.name;
    if(oldFolderName!==editFolderName){
      localFolder.name = editFolderName;
      localFolder.path = localFolder.path.substring(0, localFolder.path.lastIndexOf('/')+1)+editFolderName;
      localFolder.folder_version = timestamp;
      rootFavoritesFolder.folder_version = timestamp;
      updateChildrenPath(localFolder);
    }

    localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);

    return { 'success': true, 'folder':{id: localFolder.id, name: localFolder.name, path: localFolder.path} };
  }

  var action_folder_destroy = function(folderId){
    var timestamp = ''+(new Date()).getTime();
    set_folder(folderId);
    var rootFavoritesFolder = findRootFavoritesFolder();

    var parentFolder = findFavoritesFolderById(localFolder.parent_id);
    if(!parentFolder){
      parentFolder = rootFavoritesFolder;
    }

    if(localFolder.pending==true){
    }
    else{
    }


    // get parent's child assets to find asset unique name
    var parentFolderAssets = [];
    for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
      var asset = localFavoritesFolder.assets[ii];
      if(''+asset.folder_id===''+parentFolderAssets.id){
        parentFolderAssets.push(asset);
      }
    }
    // move child assets out to parent
    var childAssets = [];
    for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
      var asset = localFavoritesFolder.assets[ii];
      if(asset.path.match('^'+localFolder.path)){
        childAssets.push(asset);
      }
    }
    for(var ii=0; ii<childAssets.length; ii++){
      var asset = childAssets[ii];
      var tempName = asset.name;
      var nameIsUnique = false;
      var jj = 1;
      while(!nameIsUnique){
        nameIsUnique = true;
        for(var kk=0; kk<parentFolderAssets.length; kk++){
          if(parentFolderAssets[kk].name.trim()===asset.name.trim()){
            nameIsUnique = false;
            asset.name = tempName+' ('+jj+')';
            jj++;
          }
        }
      }
      asset.folder_id = parentFolder.id;
      asset.path = parentFolder.path+'/'+asset.name;
      parentFolderAssets.push(asset);
    }

    // delete selected folder and its child folders
    for(var ii=0; ii<localFavoritesFolder.folders.length; ii++){
      var folder = localFavoritesFolder.folders[ii];
      if(folder.path.match('^'+localFolder.path)){
        if(localFolder.pending==true){
          localFavoritesFolder.folders.splice(ii, 1);
          ii--;
        }
        else{
          folder.deleted = timestamp;
        }
      }
    }

    parentFolder.folder_version = timestamp;
    rootFavoritesFolder.folder_version = timestamp;

    localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);

    return {'success': true, 'parent_path': parentFolder.path};
  }

  var action_asset_update = function(editAssetParams, assetId){
    var timestamp = ''+(new Date()).getTime();
    set_asset(assetId);
    var rootFavoritesFolder = findRootFavoritesFolder();

    // move asset
    if(editAssetParams.path){
      var localDestinationFolder = findFavoritesFolderByPath(editAssetParams.path);

      if(!localDestinationFolder){
        return {'success': false, 'error_type': 'folder_not_exists'};
      }
      for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
        var asset = localFavoritesFolder.assets[ii];
        if(''+asset.id!==''+localAsset.id && !asset.deleted && ''+asset.folder_id===''+localDestinationFolder.id && ''+asset.name===''+localAsset.name){
          return {'success': false, 'error_type': 'duplicated_name'};
        }
      }
      if(localDestinationFolder.permission!=='user' || localDestinationFolder.locked!=false){
        return {'success': false, 'error_type': 'permission_denied'};
      }
      if((''+localAsset.folder_id)!==(''+localDestinationFolder.id)){
        var oldFolder = findFavoritesFolderById(localAsset.folder_id);
        if(oldFolder){
          oldFolder.folder_version = timestamp;
        }
        localAsset.folder_id = localDestinationFolder.id;
        localAsset.path = localDestinationFolder.path+'/'+localAsset.name;
        localDestinationFolder.folder_version = timestamp;
        rootFavoritesFolder.folder_version = timestamp;
        localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);
      }
    }

    // rename asset
    if(editAssetParams.name){
      var editAssetName = editAssetParams.name;
      for(var ii=0; ii<localFavoritesFolder.assets.length; ii++){
        var asset = localFavoritesFolder.assets[ii];
        if(''+asset.id!==localAsset.id && !asset.deleted && ''+asset.folder_id===''+localAsset.folder_id && ''+asset.name===''+editAssetName){
          return {'success': false, 'error_type': 'duplicated_name'};
        }
      }
      if(editAssetName.match(/^[a-z0-9()\s]+$/i)===null){
        return {'success': false, 'error_type': 'invalid_name'};
      }

      localAsset.name = editAssetName;
      localAsset.path = localAsset.path.substring(0, localAsset.path.lastIndexOf('/')+1)+editAssetName;
      var parentFolder = findFavoritesFolderById(localAsset.folder_id);
      parentFolder.folder_version = timestamp;
      rootFavoritesFolder.folder_version = timestamp;
      localStorageService.set(AuthService.currentUser.user_id+'_localFavoritesFolder', localFavoritesFolder);
    }

    return {'success': true, 'parent_path': findFavoritesFolderById(localAsset.folder_id).path, 'content_type': localAsset.content_type, 'asset': localAsset };
  }

  return {
    action_folder_create: action_folder_create,
    action_folder_update: action_folder_update,
    action_folder_destroy: action_folder_destroy,
    action_asset_update: action_asset_update
  };
});