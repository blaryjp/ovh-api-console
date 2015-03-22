angular.module('consoleApp').controller('ApiCtrl', function ($scope, Api) {
    'use strict';

    function init () {
        Api.getRootApis().then(function (apisList) {
            $scope.apiList = apisList;
        });
    }

    $scope.toggleRootApi = function (api) {
        api.visible = !api.visible;
        api.viewRAW = false;

        if (api.visible) {

            if (api.subApis) {
                return;
            }

            api.loading = true;
            Api.getSubApis(api.path).then(function (response) {
                api.subApis = response;
                api.loading = false;
            });
        }
    };

    $scope.toggleRootApiRAW = function (api) {
        api.visible = true; 
        api.viewRAW = !api.viewRAW;
    };

    $scope.requestApi = function (api) {
        api.result = {};    
        api.loading = true;
        Api.requestApi(api).then(function (response) {
            api.result.success = true;
            return response;
        }, function (response) {
            api.result.success = false;
            return response;
        }).then(function (response) {
            api.result.data = response.data;
            api.result.status = response.status;
            api.result.statusText = response.statusText;
            api.result.request = response.config;
            api.result.headers = JSON.parse(JSON.stringify(response.headers()));
            api.result.showResult = true;
            api.result.requestTime = response.requestTime;
            api.loading = false;
        });
    };


    init();

});

