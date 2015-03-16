angular.module('consoleApp').filter('prettypath', function() {
    return function (input) {
        return input.replace(/\{/g, '<span class="text-muted">{').replace(/\}/g, '}</span>');
    };
});