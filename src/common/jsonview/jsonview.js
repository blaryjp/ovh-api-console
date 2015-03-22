angular.module('consoleApp').directive('jsonview', function () {
    'use strict';

    return {
        restrict: 'A',
        scope: {
            jsonview: '='
        },
        link: function ($scope, $elem) {

            $scope.$watch('jsonview', function (val) {
                if (val) {
                    $($elem).JSONView(val);
                }
            });
        }
    };

});
