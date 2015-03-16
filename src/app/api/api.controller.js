angular.module('consoleApp').controller('ApiCtrl', function ($scope, Api) {
    'use strict';

    Api.getRoot().then(function (apisList) {
        $scope.apiList = apisList;
    });


    $scope.toggleRootApi = function (api) {
        api.visible = !api.visible;
        if (api.visible) {

            if (api.subApis) {
                return;
            }

            api.loading = true;
            Api.getSubApi(api.path).then(function (response) {
                api.subApis = response;
                api.loading = false;
            });
        }
    };

    $scope.requestApi = function (api) {
        api.result = {};    
        Api.requestApi(api).then(function (response) {
            api.result.success = true;
            api.result.data = response.data;
            api.result.status = response.status;
            api.result.statusText = response.statusText;
            api.result.request = response.config;
            api.result.headers = JSON.parse(JSON.stringify(response.headers()));
            api.result.showResult = true;
            api.result.requestTime = response.requestTime;
            console.log('resp:', response);
        }, function (response) {
            console.log('err:', response);
            api.result.success = false;
            api.result.data = response.data;
            api.result.status = response.status;
            api.result.statusText = response.statusText;
            api.result.request = response.config;
            api.result.headers = JSON.parse(JSON.stringify(response.headers()));
            api.result.showResult = true;
            api.result.requestTime = response.requestTime;
        });
    };

});

