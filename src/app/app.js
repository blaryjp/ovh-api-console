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

    // Set the Application Key (AK):
    OvhProvider.setAppKey('INSERT_AK_HERE');

    // Set the Application Secret (AS):
    OvhProvider.setAppSecret('INSERT_AS_HERE');

    // Set the API Base Path
    OvhProvider.setBaseUrl('INSERT_URL_HERE');

    // Returns complete data
    OvhProvider.setPreventReturnData(true);

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

