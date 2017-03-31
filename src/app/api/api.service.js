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

    // Build Python arguments
    function buildPythonArguments(lines, params, level) {
        if (level === undefined) {
            level = 0;
        }

        // Compute padding and separators
        var separator = level ? ": " : " = ";
        var leftPadding = '    '.repeat(level + 1);
        var maxParamNameLen = 0;

        _.forEach(params, function(param, key) {
            var len = key.length;
            maxParamNameLen = len > maxParamNameLen ? len : maxParamNameLen;
        });

        // Render !
        _.forEach(params, function(param, key) {
            var l = "";

            // Handle arrays
            if (_.isArray(params)) {
               l =  leftPadding;
            } else {
               l =  leftPadding + (level? "u'"+key+"'" : key) + ' '.repeat(maxParamNameLen - key.length) + separator;
            }

            // Print value
            if (typeof(param) === "boolean") {
                l += param ? "True":"False";
            } else if (typeof(param) === "number") {
                l += param;
            } else if (typeof(param) === "string") {
                param = param.replace('\\', '\\\\'); // Escape the escape char
                param = param.replace('"', '\\"');   // Escape double quotes
                param = param.replace('\n', '\\n');  // Escape line feed
                l += 'u"'+param+'"';
            } else if (typeof(param) === "undefined" || param === null) {
                l += "None";
            } else if (_.isArray(param)) {
                l += '[';
                lines.push(l);
                buildPythonArguments(lines, param, level+1);
                l = leftPadding + ']';
            } else if (_.isObject(param)) {
                l += '{';
                lines.push(l);
                buildPythonArguments(lines, param, level+1);
                l = leftPadding + '}';
            } else {
                console.log("Unsupported type "+typeof(param)+" for", param);
                l += '"UNSUPPORTED TYPE"';
            }

            l += ',';
            lines.push(l);
        });
    }

    // Build Php arguments
    function buildPhpArguments(lines, params, level) {
        if (level === undefined) {
            level = 0;
        }

        // Compute padding and separators
        var separator = " => ";
        var leftPadding = '    '.repeat(level + 1);
        var maxParamNameLen = 0;

        _.forEach(params, function(param, key) {
            var len = key.length;
            maxParamNameLen = len > maxParamNameLen ? len : maxParamNameLen;
        });

        // Render !
        _.forEach(params, function(param, key) {
            var l = "";

            // Handle arrays
            if (_.isArray(params)) {
               l =  leftPadding;
            } else {
               l =  leftPadding + "'"+key+"'" + ' '.repeat(maxParamNameLen - key.length) + separator;
            }

            // Print value
            if (typeof(param) === "boolean") {
                l += param ? "TRUE":"FALSE";
            } else if (typeof(param) === "number") {
                l += param;
            } else if (typeof(param) === "string") {
                param = param.replace('\\', '\\\\'); // Escape the escape char
                param = param.replace('"', '\\"');   // Escape double quotes
                param = param.replace('\n', '\\n');  // Escape line feed
                l += '"'+param+'"';
            } else if (typeof(param) === "undefined" || param === null) {
                l += "NULL";
            } else if (typeof(param) === "object") {
                l += 'array(';
                lines.push(l);
                buildPhpArguments(lines, param, level+1);
                l = leftPadding + ')';
            } else {
                console.log("Unsupported type "+typeof(param)+" for", param);
                l += '"UNSUPPORTED TYPE"';
            }

            l += ',';
            lines.push(l);
        });
    }

    // Build code samples
    function buildCodeExamples(subApi) {
        var method = subApi.operation.httpMethod.toLowerCase();
        var path = subApi.path;

        // Build parameters, as sent to the API
        var parameters = buildParameters(subApi.operation.parameters);

        // Build Path
        _.forEach(subApi.operation.parameters, function (param) {
            if (param.paramType === 'path' && param.value) {
                path = path.replace('{' + param.name + '}', encodeURIComponent(param.value));
            }

            // Prune URI param from the param list: already handled
            delete parameters.params[param.name];
        });

        // Build Python
        var python = [];
        python.push("# coding: utf-8");
        python.push("'''");
        python.push("First, install the latest release of Python wrapper: $ pip install ovh");
        python.push("'''");
        python.push("");
        python.push("import json");
        python.push("import ovh");
        python.push("");
        python.push("# Instanciate an OVH Client.");
        python.push("# You can generate new credentials with full access to your account on");
        python.push("# The token creation page: https://api.ovh.com/createToken/index.cgi?GET=/*&PUT=/*&POST=/*&DELETE=/*");
        python.push("client = ovh.Client(");
        python.push("    endpoint           = 'ovh-eu',     # Endpoint of API OVH Europe"); // TODO: use config to set the correct endpoint
        python.push("    application_key    = 'xxxxxxxxxx', # Application Key");
        python.push("    application_secret = 'xxxxxxxxxx', # Application Secret");
        python.push("    consumer_key       = 'xxxxxxxxxx', # Consumer Key");
        python.push(")");
        python.push("");
        if (parameters.param || parameters.data) {
            python.push("result = client."+method+"('"+path+"',");
            buildPythonArguments(python, parameters.param);
            buildPythonArguments(python, parameters.data);
            python.push(")");
        } else {
            python.push("result = client."+method+"('"+path+"')");
        }
        python.push("");
        python.push("# Pretty print();");
        python.push("print(json.dumps(result, indent=4))");

        // Build PHP
        var php = [];
        php.push("<?php");
        php.push("/**");
        php.push(" * First, download the latest release of PHP wrapper from");
        php.push(" * https://github.com/ovh/php-ovh/releases and include this");
        php.push(" * script into the folder with extracted files.");
        php.push(" */");
        php.push("require __DIR__ . '/vendor/autoload.php';");
        php.push("use \\Ovh\\Api;");
        php.push("");
        php.push("/**");
        php.push(" * Instanciate an OVH Client.");
        php.push(" * You can generate new credentials with full access to your account on");
        php.push(" * The token creation page: https://api.ovh.com/createToken/index.cgi?GET=/*&PUT=/*&POST=/*&DELETE=/*");
        php.push(" */");
        php.push("$client = new Api(");
        php.push("    'xxxxxxxxxx', // Application Key");
        php.push("    'xxxxxxxxxx', // Application Secret");
        php.push("    'ovh-eu',     // Endpoint of API OVH Europe"); // TODO: use config to set the correct endpoint
        php.push("    'xxxxxxxxxx', // Consumer Key");
        php.push(");");
        php.push("");
        if (parameters.param || parameters.data) {
            php.push("$result = $client->"+method+"('"+path+"', array(");
            buildPhpArguments(php, parameters.param);
            buildPhpArguments(php, parameters.data);
            php.push("));");
        } else {
            php.push("$result = $client->"+method+"('"+path+"');");
        }
        php.push("");
        php.push("// Pretty print();");
        php.push("print_r( $result );");

        // POC: build python code sample
        var examples = {
            'python': {name: "Python", code: python.join('\n')},
            'php':    {name: "PHP",    code: php.join('\n')},
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
                if (paramValue || paramValue === false || param.required || (param.inputMode !== 'input' && param.inputMode !== undefined)) {
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
            if (paramValue || paramValue === false || param.required || (param.inputMode !== 'input' && param.inputMode !== undefined)) {
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
