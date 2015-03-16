angular.module('consoleApp').service('Api', function (Ovh) {
    'use strict';

    var API_BASE = '';

    this.getRoot = function () {
        return Ovh.getSchema('/?null');
    };





    // var isEnum = function(param) {
    //     if (param == null) {return false;}
    //     return param.enum || isEnum(param.model);
    // };

    // var getDefaultValue = function(param) {
    //     if (param.value == null) {
    //         return param['default'] || param.defaultValue;
    //     }
    //     return param.value;
    // };

    // var getInputType = function(param, type, name) {
    //     if (/^password$/i.test(type) || /^password$/i.test(name)) {return 'password';}
    //     if (/^text$/i.test(type)) {return 'textarea';}
    //     if (/^boolean$/i.test(type)) {return 'checkbox';}
    //     if (param.modelError != null) {return 'model-error';}
    //     if (isEnum(param)) {
    //         if (param.isArray === true) {
    //             return 'select-multiple';
    //         }
    //         param.value = getDefaultValue(param);
    //         return 'select';
    //     }
    //     if (param.apiValues && /^datalist$/i.test(param.inputType)) {
    //         return 'datalist';
    //     }


    //     return 'text';
    // };



function parseParameters (api, parameters) {
    _.forEach(parameters, function (param) {
        // parameter is a model ?
        // if (api.models[param.dataType]) {
        //     if (api.models[param.dataType].enul)
        // }
        param.isModel = !!api.models[param.dataType];

        param.isEnum = param.isModel && !!api.models[param.dataType].enum;

        // format complex type
        if (param.isModel) {

            if (param.isEnum) {
                param.enum = api.models[param.dataType];
            } else {

                param.name = api.models[param.dataType].id;     // Because missing name 

                param.modelProperties = [];   

                var modelProperties = _.pick(api.models[param.dataType].properties, function (val) { return val.readOnly === 0; });

                _.forEach(modelProperties, function (modelPropertieVal, modelPropertieName) {
                    param.modelProperties.push({
                        dataType    : modelPropertieVal.type,
                        description : modelPropertieVal.description,
                        name        : modelPropertieName,
                        paramType   : param.paramType,
                        required    : modelPropertieVal.canBeNull ? 0 : 1
                    });
                });

                parseParameters(api, param.modelProperties);

            }
        }
    });
}




    this.getSubApi = function (path) {
        return Ovh.getSchema(path).then(function (subApi) {
            // reorganize from operations
            if (subApi.apis && subApi.apis.length) {
                var subApiList = [];
                _.forEach(subApi.apis, function (api) {
                    _.forEach(api.operations, function (operation) {

                        // responseType is a model?
                        operation.responseTypeIsModel = !!subApi.models[operation.responseType];

                        // erk... need to find a better solution
                        operation.parameters = _.sortByOrder(operation.parameters, ['paramType'], [false]);
                        
                        // check operation params
                        parseParameters(subApi, operation.parameters );


                        subApiList.push({
                            path        : api.path,
                            description : api.description,
                            operation   : operation
                        });

                    });
                });
                subApi.apis = _.sortBy(subApiList, 'path');
            }

            console.log('tadam: ', subApi);
            return subApi;
        });
    };


    this.requestApi = function (api) {
        console.log(api);

        var config = {
            params: {}
        };

        var url = API_BASE + api.path;


        if (api.operation.parameters.length) {
            _.forEach(api.operation.parameters, function (param) {

                if (param.isModel && !param.isEnum) {

                    _.forEach(param.modelProperties, function (modelParam) {
                        /*if (param.isModel && !param.isEnum) {

                        } else {*/
                            switch (modelParam.paramType) {
                            case 'path':
                                if (!config.params) {
                                    config.params = {};
                                }
                                config.params[modelParam.name] = modelParam.value;
                                break;
                            case 'body':
                                if (!config.data) {
                                    config.data = {};
                                }
                                config.data[modelParam.name] = modelParam.value;
                                break;
                            }
                        //}
                    });
                } else {
                    switch (param.paramType) {
                    case 'path':
                        if (!config.params) {
                            config.params = {};
                        }
                        config.params[param.name] = param.value;
                        break;
                    case 'body':
                        if (!config.data) {
                            config.data = {};
                        }
                        config.data[param.name] = param.value;
                        break;
                    }
                }
            });
        }





        var startTime = new Date().getTime();
        return Ovh[api.operation.httpMethod.toLowerCase()](url, config).then(function (response) {
            response.requestTime = new Date().getTime() - startTime;
            return response;
        });
    };

});