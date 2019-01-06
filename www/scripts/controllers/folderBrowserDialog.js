function folderBrowserDialog ($scope, AuthService, FolderService, GlobalService){

  var token = AuthService.authToken;
  var userId = AuthService.currentUser.user_id;
  var groupId = AuthService.currentUser.group_id;


  $scope.showFolderBrowserDialog = function(){
    // $scope.browse('/root/Cloud');
    $scope.folderBrowserDialogBrowse($scope.folderData.currentFolder.path);
    $('#folderBrowserModal').modal('show');

  }

  $scope.folderBrowserDialogBrowse = function(path){
    $scope.folderBrowserDialogFolderData = {};
    $scope.browseByType($scope, path, 'folder', token, userId, groupId, 'folderBrowserDialog');
  }

}
