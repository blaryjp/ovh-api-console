angular.module('consoleApp').service('Api', function ($rootScope, $q, Ovh) {
    'use strict';

    // You can hide APIs: just add its path into this array:
    // Example: var hiddenApis = ['/auth', '/dedicated/server/{serviceName}'];
    var hiddenApis = [];

    // ---

    this.getRootApis = function () {
        return Ovh.getSchema('/?null').then(function (response) {

            response.apis = _.filter(response.apis, function (api) { return hiddenApis.indexOf(api.path) === -1; });

            _.forEach(response.apis, function (api) {
                api.original = _.cloneDeep(api);
            });
            return response;
        });
    };

    function parseParameters (method, api, parameters, level) {
        var bodyParamCount = 0;
        var lastBodyParamId = 0;
        if (level === undefined) {
            level = 0;
        }

        _.forEach(parameters, function (param, id) {

            // parameter is a model?
            param.isModel = !!api.models[param.dataType];

            // parameter is an enum?
            param.isEnum = param.isModel && !!api.models[param.dataType].enum;

            // format complex type
            if (param.isModel) {

                if (param.isEnum) {
                    param.enum = api.models[param.dataType];
                } else {

                    param.name = param.name || api.models[param.dataType].id;     // Because missing name

                    param.modelProperties = [];

                    var modelProperties = _.pick(api.models[param.dataType].properties, function (val) { return !val.readOnly; });

                    _.forEach(modelProperties, function (modelPropertieVal, modelPropertieName) {
                        param.modelProperties.push({
                            dataType    : modelPropertieVal.type,
                            description : modelPropertieVal.description,
                            name        : modelPropertieName,
                            paramType   : param.paramType,
                            required    : modelPropertieVal.canBeNull || method === 'PUT' ? 0 : 1,
                        });
                    });

                    // loop!
                    parseParameters(method, api, param.modelProperties, level + 1);
                }
            }

            // Increment body counter, to decide wether to move this API UP
            if (param.paramType === 'body') {
                bodyParamCount++;
                lastBodyParamId = id;
            }
        });

        // If there is a single param AND this is a PUT --> move all params 1 level up
        if (method === "PUT" && level === 0 && bodyParamCount === 1) {
            _.forEach(parameters[lastBodyParamId].modelProperties, function (param) {
                parameters.push(param);
            });
            parameters.splice(lastBodyParamId, 1);
        }

    }

    // Build code samples
    function buildCodeExamples(subApi) {
        // POC: build python code sample
        var examples = {
            'python': {name: "Python", code: "print 'Hello Python !'"},
            'php':    {name: "PHP",    code: "echo 'Hello PHP';"},
        };

        subApi.examples = examples;
    }

    this.getSubApis = function (path) {
        return Ovh.getSchema(path).then(function (subApi) {

            subApi.original = _.cloneDeep(subApi);

            // reorganize from operations
            if (subApi.apis && subApi.apis.length) {
                var subApiList = [];

                subApi.apis = _.filter(subApi.apis, function (api) { return hiddenApis.indexOf(api.path) === -1; });

                _.forEach(subApi.apis, function (api) {
                    _.forEach(api.operations, function (operation) {

                        // responseType is a model?
                        operation.responseTypeIsModel = !!subApi.models[operation.responseType];

                        // erk... need to find a better solution
                        operation.parameters = _.sortByOrder(operation.parameters, ['paramType'], [false]);

                        // check operation params
                        parseParameters(operation.httpMethod, subApi, operation.parameters);

                        // build subApiRoute
                        var subApiRoute = {
                            path        : api.path,
                            description : api.description,
                            operation   : operation,
                            examples    : {},
                        };

                        // initial code sample build
                        buildCodeExamples(subApiRoute);

                        // watch for parameter changes and update the code
                        $rootScope.$watch(function() {return operation;}, function(operation, oldOperation) {
                            buildCodeExamples(subApiRoute);
                        }, true);

                        // Here it is
                        subApiList.push(subApiRoute);
                    });

                });

                subApi.apis = _.sortBy(subApiList, 'path');
            }

            return subApi;
        });
    };

    function getRequestParamValue (param) {
        // complex type in complex type
        if (param.isModel && !param.isEnum) {
            var ret = {};
            _.forEach(param.modelProperties, function (_param) {
                var paramValue = getRequestParamValue(_param);

                // If the value evaluates to false, prune it, unless it is mandatory or explicitely marked as null by the user
                if (paramValue || _param.required || _param.inputMode !== 'input') {
                    ret[_param.name] = paramValue;
                }
            });
            return ret;
        } else {
            return param.value;
        }
    }

    function buildParameters(parameters) {
        var config = {};

        // parse params
        _.forEach(parameters, function (param) {
            var paramCategory = "";
            var paramValue = getRequestParamValue(param);

            switch (param.paramType) {
                case 'path':
                case 'query':
                    paramCategory = "params";
                    break;
                case 'body':
                    paramCategory = "data";
                    break;
            }

            // If the value evaluates to false, prune it, unless it is mandatory or explicitely marked as null by the user
            if (paramValue || param.required || param.inputMode !== 'input') {
                if (!config[paramCategory]) {
                    config[paramCategory] = {};
                }
                config[paramCategory][param.name] = paramValue;
            }
        });

        return config;
    }

    this.requestApi = function (api) {
        var config = buildParameters(api.operation.parameters);

        if (api.operation.noAuthentication) {
            config.noAuthentication = true;
        }

        var startTime = new Date().getTime();
        return Ovh[api.operation.httpMethod.toLowerCase()](api.path, config).then(function (response) {
            response.requestTime = new Date().getTime() - startTime;
            return response;
        }, function (response) {
            response.requestTime = new Date().getTime() - startTime;
            return $q.reject(response);
        });
    };

});
