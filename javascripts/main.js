
"use strict";

require.config({
    paths : {
        'angular' : './lib/angular.min',
        'domReady': './lib/domReady'

    },
    shim: {
        'angular' : {
            exports : 'angular'
        }
    }
});

require([
    'domReady',
], function(domReady) {

    domReady(function () {

        require(['angular', "randomapp"], function(){
            angular.bootstrap(document, ['randomapp']);
        });
    });
});
