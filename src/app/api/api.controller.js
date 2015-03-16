angular.module('consoleApp').controller('ApiCtrl', function ($scope, Api) {
    'use strict';

    function init () {
        Api.getRootApis().then(function (apisList) {
            $scope.apiList = apisList;
        });
    }

    $scope.toggleRootApi = function (api) {
        api.visible = !api.visible;
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

    $scope.requestApi = function (api) {
        api.result = {};    
        api.loading = true;
        Api.requestApi(api).then(function (response) {
            api.result.success = true;
            return response;
        }, function (response) {
            api.result.success = false;
            return response;
        }).then(function (commonResponse) {
            api.result.data = commonResponse.data;
            api.result.status = commonResponse.status;
            api.result.statusText = commonResponse.statusText;
            api.result.request = commonResponse.config;
            api.result.headers = JSON.parse(JSON.stringify(commonResponse.headers()));
            api.result.showResult = true;
            api.result.requestTime = commonResponse.requestTime;
            api.loading = false;
        });
    };


    init();

});

