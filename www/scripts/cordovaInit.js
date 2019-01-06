function onLoad() {
	if (typeof cordova == 'undefined'){
    	// document.addEventListener("load", onDeviceReady, false);
    	onDeviceReady();
	}
	else {
    	document.addEventListener("deviceready", onDeviceReady, false);
	}
}

var onDeviceReady = function(){
	var disableLog = true;
  var showLogOnPage = false;

	window.onerror = function(message, url, lineNumber) {
      console.log("Error! message: "+message+" in "+url+" at line "+lineNumber);
      return true;
  }

  if(showLogOnPage){
    document.getElementById('consoleLog').style.display = 'block';
  }

  if(window['console']){
    if(disableLog){
      var oldConsoleLog = console.log;
        window['console']['log'] = function(){}
    }
    else if(showLogOnPage){
      var writeToPage = function(str){
        document.getElementById('consoleLog').innerHTML += '=> '+str+'<br>';
      }
      methods = ['log', 'error', 'debug', 'warn', 'info', 'dir', 'dirxml', 'trace', 'profile', 'assert'];
      for(var ii=0; ii<methods.length; ii++){
        window['console'][methods[ii]] = writeToPage;
      }
    }
  }
  console.log('do on device ready');

  var agent = navigator.userAgent;
  console.log('Agent: '+agent);

  window.isTablet = agent.match(/iPad|Android/i);
  window.useLocalFileSystem = (typeof LocalFileSystem !== undefined && typeof cordova !== 'undefined' && typeof cordova.file !== 'undefined');

  window.useLocalStorage = window.useLocalFileSystem;

	if(window.isTablet){
		if(window.useLocalFileSystem){
			window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onRequestFileSystemSuccess, null);
			function onRequestFileSystemSuccess(fileSystem) {
		        var entry=fileSystem.root;
		        console.log('entry: '+JSON.stringify(entry));
			}

			// function directoryIsExist(entry){
			// 	console.log('directory already exist: '+entry.name);
			// }
      var directoryPath = '';
      if(typeof cordova.file  !== 'undefined' && cordova.file.dataDirectory){
        directoryPath = cordova.file.dataDirectory;
      }

			window.resolveLocalFileSystemURL(directoryPath, function(entry){
		        console.log('dataDirectory: '+JSON.stringify(entry));

		        window.resolveLocalFileSystemURL(directoryPath+'contents', function(entry){
		        	console.log('dataDirectory/contents already exist');
		        }, function(){
			    	entry.getDirectory("contents", {create: true, exclusive: false}, function(entry){
			    		console.log('dataDirectory/contents: '+JSON.stringify(entry));
			    	}, function(){ console.log('dataDirectory/contents failed.')});
			    });

			}, function(){
				console.log('cannot find dataDirectory');
			});
		}
	}

  var domElement = document.getElementById('searaClientBody');

  angular.bootstrap(domElement, ["searaClientApp"]);

  if(navigator.splashscreen){
    navigator.splashscreen.hide();
  }
}
