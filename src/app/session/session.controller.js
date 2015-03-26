angular.module('consoleApp').controller('SessionCtrl', function ($rootScope, $scope, Ovh) {
    'use strict';

    function init () {
        $scope.isLogged = Ovh.isLogged();

        if ($scope.isLogged) {
            Ovh.get('/me').then(function (response) {
                $scope.me = response.data;
            }, function () {
                $scope.logout();
            });
        }
    }

    $scope.login = function () {
        $scope.loading = true;
        return Ovh.login();
    };

    $scope.logout = function () {
        $scope.loading = true;
        return Ovh.logout()['finally'](function () {
            $scope.me = null;
            $scope.isLogged = false;
            $scope.loading = false;
            $rootScope.$broadcast('session.logout');
        });
    };


    init();

});

