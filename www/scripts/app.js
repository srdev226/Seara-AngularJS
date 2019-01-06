 'use strict';

/**
 * @ngdoc overview
 * @name searaClientApp
 * @description
 * # searaClientApp
 *
 * Main module of the application.
 */
angular
  .module('searaClientApp', [
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'angularFileUpload',
    'LocalStorageModule',
    'ui.bootstrap',
    'ngTouch',
    'ionic',
    'ngCordova',
    'ionic.service.core',
    'ionic.service.push'
  ])

  .config(['$provide', '$httpProvider', '$routeProvider', '$locationProvider', 'localStorageServiceProvider', '$compileProvider', '$sceDelegateProvider', '$ionicAppProvider',
    function ($provide, $httpProvider, $routeProvider, $locationProvider, localStorageServiceProvider, $compileProvider, $sceDelegateProvider, $ionicAppProvider) {
    // localStorageServiceProvider.setPrefix('userData');
    $ionicAppProvider.identify({
      // The App ID (from apps.ionic.io) for the server
      app_id: '5b6e463d',
      // The public API key all services will use for this app
      api_key: 'e3de175b5dd8cad1b3e75211874c252dbe859e2fd9797f77',
      // Set the app to use development pushes
      dev_push: false
    });

    $provide.factory('myHttpInterceptor', ['$q', '$location', 'localStorageService', 'LoadingMaskService', 'DialogService', 
      function ($q, $location, localStorageService, LoadingMaskService, DialogService) {
      return {
        'request': function (config) {
          return config;
        },
        'requestError': function (rejection) {
          return $q.reject(rejection);
        },
        'response': function (response) {
          return response;
        },
        'responseError': function (rejection) {
          var status = rejection.status;
          if(status===401){
            if(rejection.data.error_type=='not_logged_in'){
              LoadingMaskService.hideLoadingMask();
              DialogService.showSimpleDialog('Session timeout. Please login again.');
              localStorageService.remove('currentUser');
              localStorageService.remove('authToken');
              $location.path('/login');    
            }
            else if(rejection.data.error_type=='unauthorized'){
              DialogService.showSimpleDialog('Unauthorized action');
            }
          }
          return $q.reject(rejection);
        }
      }
    }]);
    
    $httpProvider.interceptors.push('myHttpInterceptor');
    
    $routeProvider
      .when('/login', {
        templateUrl: 'views/users/login.html',
        controller: 'LoginCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', function ($q, $rootScope, AuthService) {
            var deferred = $q.defer();
            AuthService.redirectIfLoggedIn().then(
              function () {
                $rootScope.showMenu = false;
                $rootScope.titleName = undefined;
                deferred.resolve();
              },
              function () {
                deferred.reject();  
              }

            );

            return deferred.promise;
          }]
        }
      })
      .when('/register', {
        templateUrl: 'views/users/register.html',
        controller: 'RegisterCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', function ($q, $rootScope, AuthService) {
            var deferred = $q.defer();
            AuthService.redirectIfLoggedIn().then(
              function () {
                $rootScope.showMenu = false;
                $rootScope.titleName = undefined;
                deferred.resolve();
              },
              function () {
                deferred.reject();  
            });
            return deferred.promise;
          }]
          // auth: function (AuthService, $q, $rootScope) {

          //   return AuthService.auth();
          // }
        }
      })
      .when('/account/manage', {
        templateUrl: 'views/account/manage.html',
        controller: 'AccountManageCtrl',
        resolve: {
          beforeLoad: [ '$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            $rootScope.titleName = 'Account Management';
            deferred.resolve();

            return deferred.promise;
          }],
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/management/users/index', {
        templateUrl: 'views/users/index.html',
        controller: 'UsersIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', '$location', function ($q, $rootScope, AuthService, $location) {
            var deferred = $q.defer();
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'User Management';
              deferred.resolve();
            });
            return deferred.promise;
          }]
        }
      })
      .when('/management/users/approve', {
        templateUrl: 'views/users/approve.html',
        controller: 'UsersApproveCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', '$location', function ($q, $rootScope, AuthService, $location){
            var deferred = $q.defer();
            AuthService.auth().then(function (){
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'User Management';
              deferred.resolve();
            });
            return deferred.promise;
          }]
        }
      })
      .when('/management/users/:id/activities', {
        templateUrl: 'views/activities/index.html',
        controller: 'UserActivitiesCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', '$location', function ($q, $rootScope, AuthService, $location) {
            var deferred = $q.defer();
            AuthService.auth().then(function() {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'User Activity Log';
              deferred.resolve();
            });
            return deferred.promise;
          }]
        }
      })
      .when('/presentations/index:path*', {
        templateUrl: 'views/folders/index.html',
        controller: 'PresentationIndexCtrl',
        resolve: {
          path: ['$rootScope', '$q', '$route',  '$location', 'GlobalService', 'AuthService', function ($rootScope, $q, $route,  $location, GlobalService, AuthService) {
            var deferred = $q.defer();
            deferred.resolve($route.current.params.path);
            return deferred.promise;
          }]
        }
      })
      .when('/presentations/:id/edit', {
        templateUrl: 'views/presentations/edit.html',
        controller: 'PresentationEditCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
          }],
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/cloud/index:path*', {
        templateUrl: 'views/folders/index.html',
        controller: 'CloudIndexCtrl',
        resolve: {
          path: ['$q', '$route', '$location', 'GlobalService', 'AuthService', '$rootScope', function ($q, $route,  $location, GlobalService, AuthService, $rootScope) {
            var deferred = $q.defer();
            if($rootScope.isOnline){
              if($route.current.params.path=='/root'){
                $rootScope.titleName = 'Seara Cloud';
                $location.path('/cloud/index/root/Seara Cloud');
              }
              else{
                deferred.resolve($route.current.params.path);
              }
            }
            else{
              $rootScope.titleName = 'Seara Cloud';
              if(window.useLocalFileSystem) {
                GlobalService.showSimpleDialog('No connection. Only Presentations and Favorites available.');
              }
              else {
                GlobalService.showSimpleDialog('No connection. Please try again.');
              }
            }
            return deferred.promise;
          }]
        }

      })
      .when('/favorites/index:path*', {
        templateUrl: 'views/folders/index.html',
        controller: 'FavoritesIndexCtrl',
        resolve: {
          path: ['$q', '$route', '$rootScope', '$location', 'GlobalService', 'AuthService', function ($q, $route, $rootScope, $location, GlobalService, AuthService) {
            var deferred = $q.defer();
            deferred.resolve($route.current.params.path);
            return deferred.promise;
          }]
        }
      })
      .when('/trainings/', {
        templateUrl: 'views/articles/index.html',
        controller: 'TrainingsIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            $rootScope.titleName = 'Training';
            deferred.resolve();
            return deferred.promise;
          }],
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/news', {
        templateUrl: 'views/articles/index.html',
        controller: 'NewsIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            $rootScope.titleName = 'News & Updates';
            deferred.resolve();
            return deferred.promise;
          }],
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/news/add', {
        templateUrl: 'views/news/new.html',
        controller: 'NewsAddCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', '$location', function ($q, $rootScope, AuthService, $location) {
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              var deferred = $q.defer();
              $rootScope.titleName = 'News & Updates';
              deferred.resolve();
              
              return deferred.promise;

            },function () {
              return;
            });
          }]
        }
      })
      .when('/news/:id/edit', {
        templateUrl: 'views/news/edit.html',
        controller: 'NewsEditCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', 'AuthService', '$location', function ($q, $rootScope, AuthService, $location) {
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              var deferred = $q.defer();
              $rootScope.titleName = 'News & Updates';
              deferred.resolve();
              
              return deferred.promise;

            });
          }]
        }
      })
      .when('/epublications', {
        templateUrl: 'views/articles/category_list.html',
        controller: 'EPublicationsCategoryCtrl',
        resolve: {
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/epublications/:category', {
        templateUrl: 'views/articles/index_grid.html',
        controller: 'EPublicationsIndexCtrl',
        resolve: {
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }],
          path: ['$q', '$route',  '$location', 'GlobalService', 'AuthService', function ($q, $route,  $location, GlobalService, AuthService) {
            var deferred = $q.defer();
            if ($route.current.params.path=='/root'){
              GlobalService.proxyRequest(
                'epublications?auth_token='+AuthService.authToken,
                'GET',{},
                true
              )
              .success(function (data, status) {
                $location.path('/epublications/index'+data.path);
                })
              .error(function () {
                console.log('Error in browse. Please try again');
                $location.path('/');
              });
            }
            else deferred.resolve($route.current.params.path);
          return deferred.promise;
          }]
        }
      })
      .when('/management', {
        templateUrl: 'views/management/index.html',
        controller: 'ManagementIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', '$location', 'AuthService', function ($q, $rootScope, $location, AuthService) {
            var deferred = $q.defer();
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'Management';
              deferred.resolve();
            });
            return deferred.promise;
          }]
          
        }
      })
      .when('/management/activities/index', {
        templateUrl: 'views/activities/index.html',
        controller: 'ActivitiesIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', '$location', 'AuthService', function ($q, $rootScope, $location, AuthService) {
            var deferred = $q.defer();
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'Activity Log';
              deferred.resolve();
            });
            return deferred.promise;
          }]
          
        }
      })
      .when('/management/notifications/index', {
        templateUrl: 'views/notifications/index.html',
        controller: 'NotificationsIndexCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', '$location', 'AuthService', function ($q, $rootScope, $location, AuthService) {
            var deferred = $q.defer();
            AuthService.auth().then(function () {
              if(AuthService.currentUser.group_id>=2){
                $location.path('/401');
                return;
              }
              $rootScope.titleName = 'Notifications';
              deferred.resolve();
            });
            return deferred.promise;
          }]
          
        }
      })
      .when('/', {
        templateUrl: 'views/home.html',
        controller: 'HomeCtrl',
        resolve: {
          beforeLoad: ['$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            $rootScope.titleName = undefined;
            deferred.resolve();
            return deferred.promise;
          }]
          ,
          auth: ['AuthService', function (AuthService) {
            return AuthService.auth();
          }]
        }
      })
      .when('/401', {
        templateUrl: '401.html',
        resolve: {
          beforeLoad: ['$q', '$rootScope', function ($q, $rootScope) {
            var deferred = $q.defer();
            $rootScope.titleName = undefined;
            deferred.resolve();
            return deferred.promise;
          }]
        }

      })
      .otherwise({
        redirectTo: '/'
      });
  }])
  .run(['$http', '$timeout', '$interval', '$rootScope', '$templateCache', '$window', '$location', 'AuthService', 'localStorageService', 'FileSyncService', 'GlobalService', 'ConnectionService', 'ServerConfigService', 'PushNotificationsService',
    function ($http, $timeout, $interval, $rootScope, $templateCache, $window, $location, AuthService, localStorageService, FileSyncService, GlobalService, ConnectionService, ServerConfigService, PushNotificationsService) {
    
    $rootScope.disablePdf = window.isTablet;

    $rootScope.debugData = {
      'agent': navigator.userAgent,
      'isTablet': window.isTablet || 'no',
      'localJSON': window.useLocalStorage,
      'localFile': window.useLocalFileSystem? cordova.file.dataDirectory: 'no',
      'apiUrl': ServerConfigService.apiUrl,
      'proxyUrl': GlobalService.proxyUrl,
      'cordova': (typeof cordova != 'undefined')    
    };

    $rootScope.blurInput = function () {
      $('input:focus').blur();
    }

    if(AuthService.loadCurrentUser()){
      if(window.isTablet) {
        PushNotificationsService.pushRegister();
      }
    }
    
    $rootScope.$on('$routeChangeStart', function (event, current, next) {

      //highlight menu
      var menuList = [
        'presentations',
        'cloud',
        'favorites',
        'training',
        'news',
        'epublications',
        '(management|users)',
        'account'
      ];
      $rootScope.menuSelected = new Array(menuList.length);
      $rootScope.goTo = function (url) {
        $location.path(url);
      }
      for(var i=0; i<menuList.length; i++){
        var regex = new RegExp('^\/'+menuList[i]);
        if($location.path().match(regex)) $rootScope.menuSelected[i] = 'selected';
        else $rootScope.menuSelected[i] = '';
      }

      //remove shown backdrop that is not yet hidden
      $('.modal-backdrop').hide();

      $(document).ready(function () {
        $rootScope.debugData.width = $(document).width();
        $rootScope.debugData.height = $(document).height();

        $timeout(function () {
          $('.modal').unbind("shown.bs.modal");
          $('.modal').on("shown.bs.modal",function () {
          //focus on first input field of every modal
            if($('input', this).length>0){
              $('input', this)[0].focus();
            }
          //or if no input field focus on default button
            else if($('button', this).length>0){
              $('button.default-focus', this).focus();
            }
            console.log('show modal');
          });

          $('.modal').unbind("hidden.bs.modal");
          $('.modal').on("hidden.bs.modal",function () {
            document.activeElement.blur();
            $('input').blur();
            console.log('hide modal');
          });

          //focus on first   input field
          if($('form input').length>0){
            $('form input')[0].focus();
          }

          //autocomplete off
          $('form').attr('autocomplete', 'off');
        },500);
      });

      //set menu overflow and background s      

      $('.all-menu').ready(function () {
	      // console.log('set menu');
        GlobalService.setSPosition();
      }); // $('.all-menu').ready

      $rootScope.titlebarRightButtons = [];
      
    }); // $rootScope.$on('$routeChangeStart')


    //remove template cache
    if(typeof(current)!=='undefined'){
      $templateCache.remove(current.templateUrl);
    }

    //init on/offline icon
    ConnectionService.checkConnection();

    AuthService.auth().then(function () {
      if(AuthService.authToken!==undefined){
        AuthService.updateCurrentUser();
      
        if(window.useLocalStorage){
          console.log('client is tablet => start sync')
          FileSyncService.syncPresentationsAndFavorites();
        }
      }
    });
    
    $rootScope.setTitlebarRightButtons = function ($scope, titlebarRightButtons) {
      $rootScope.titlebarRightButtons = [];
      
      for(var ii=0; ii<titlebarRightButtons.length; ii++){

        $rootScope['functionToCall'+ii] = $scope[titlebarRightButtons[ii].functionToCall];
        $rootScope.titlebarRightButtons.push({
          functionToCall: 'functionToCall'+ii+titlebarRightButtons[ii].args,
          iconClass: titlebarRightButtons[ii].iconClass,
          text: titlebarRightButtons[ii].text
        });
      }
    }


  }])
.directive('onTouchEnd', function () {
  return {
    restrict: 'A',
    link: function ($scope, $elm, $attrs) {
      var clickType;
      if(window.isTablet) clickType = 'touchend';
      else clickType = 'mouseup';
      $elm.bind(clickType, function (evt) {
        
        window.holding = false;

        // console.log('click: end');

        // console.log('released: '+evt.type);
        $scope.$apply(function () {
          $scope.$eval($attrs.onTouchEnd,
          {$event: evt})
        });
      });
    }
  }
})
.directive('onTouchBegin', function () {
  return {
    restrict: 'A',
    link: function ($scope, $elm, $attrs) {
      var clickType;
      if(window.isTablet) clickType = 'touchstart';
      else clickType = 'mousedown';

      window.holding = true;

      $elm.bind(clickType, function (evt) {
        // evt.preventDefault();
        // console.log(clickType);

        // http://stackoverflow.com/questions/8692678/javascript-on-ios-preventdefault-on-touchstart-without-disabling-scrolling
        // may need to write scrolling code by oaxz
        
        setTimeout(function () {
          // if(window.holding) {

            evt.preventDefault();
          // }
        }, 500);

       var realEvent;
        if(evt.type=='touchstart'){
          realEvent = evt.originalEvent.touches[0];
        }
        else{
          realEvent = evt;
        }

        // console.log('click: begin');

        window.touchStartX = realEvent.clientX;
        window.touchStartY = realEvent.clientY;

        if(evt.type=='mousedown' && evt.button!=0) return;
        else if(evt.type=='touchstart'){
          //only accept touch[0]
        }
        $scope.$apply(function () {
          $scope.$eval($attrs.onTouchBegin,
              {$event: realEvent})
        });
      });
    }
  }
})
.directive('onTouchMove', function () {
  return {
    restrict: 'A',
    link: function ($scope, $elm, $attrs) {
      var clickType;
      if(window.isTablet) clickType = 'touchmove';
      else clickType = 'mousemove';

      $elm.bind(clickType, function (evt) {
        var realEvent;
        window.holding = false;
        if(evt.type=='touchmove'){
          realEvent = evt.originalEvent.touches[0]; 
        }
        else{
          realEvent = evt;
        }

        // console.log('click: move');

        //threshold for holding
        var x = realEvent.clientX;
        var y = realEvent.clientY;
        var threshold = 10;
        // var dist = Math.sqrt( Math.pow(x - window.touchStartX, 2) + Math.pow(y - window.touchStartY, 2) );
        // if(dist>15){
        if(Math.abs(x-window.touchStartX)>threshold || Math.abs(y-window.touchStartY)>threshold) {
          $scope.$apply(function () {
            $scope.$eval($attrs.onTouchMove,
            {$event: realEvent})
          });
        }
      });
    }
  }
})
.directive('noDelayClick', function () {
  return {
    restrict: 'A',
    link: function ($scope, $elm, $attrs) {
      $elm.bind('mousedown mouseup', function (evt) {
        console.log('click: nodelay');
        console.log(evt.type);
        if(!window.isNoDelayClicked && evt.type=='mousedown'){
          window.isNoDelayClicked = true;
          window.noDelayClickObject = $elm;
          console.log($elm);
        }
        else if(window.isNoDelayClicked && evt.type=='mouseup'){
          window.isNoDelayClicked = false;
          console.log($elm);
          console.log($elm==window.noDelayClickObject);
        }
        return;
        $scope.$apply(function () {
          $scope.$eval($attrs.noDelayClick,
          {$event: evt})
        });
      });
    }  
  }
})
.directive('noImage', function () {
    var setDefaultImage = function (el) {
        el.attr('src', "images/svg/placeholder.svg");
    };

    return {
        restrict: 'A',
        link: function (scope, el, attr) {
            scope.$watch(function () {
              return attr.ngSrc;
            }, function () {
                var src = attr.ngSrc;

                if (!src) {
                  setDefaultImage(el);
                }
            });

            el.bind('error', function () { setDefaultImage(el); });
        }
    };
})
.directive('repeatDone', function () {
  return function (scope, element, attrs) {
    if (scope.$last) { // all are rendered
      scope.$eval(attrs.repeatDone);
    }
  }
});



// .directive("repeatPassword", function () {
//   return {
//     require: "ngModel",
//     link: function (scope, elem, attrs, ctrl) {
//       var otherInput = elem.inheritedData("$formController")[attrs.repeatPassword];
//       ctrl.$parsers.push(function (value) {
//           if(value === otherInput.$viewValue) {
//               ctrl.$setValidity("repeat", true);
//               return value;
//           }
//           ctrl.$setValidity("repeat", false);
//       });

//       otherInput.$parsers.push(function (value) {
//           ctrl.$setValidity("repeat", value === ctrl.$viewValue);
//           return value;
//       });
//     }
//   };
// });
