angular.module( 'consoleApp', [
  'ngSanitize',
  'ui.bootstrap',
  'ui.router',
  'templates-app',
  'templates-common',
  'ngOvh'
])

.config( function myAppConfig ( $stateProvider, $urlRouterProvider ) {
  $urlRouterProvider.otherwise( '/' );
})

.config(function (OvhProvider) {


    // [... other options]

})

.run(function () {
    $.scrollUp({
        scrollImg: true
    });
})

.controller( 'AppCtrl', function AppCtrl ( $scope, $location ) {
  $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){
    if ( angular.isDefined( toState.data.pageTitle ) ) {
      $scope.pageTitle = toState.data.pageTitle + ' | My Little API' ;
    }
  });
})

;

