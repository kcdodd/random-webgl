/*
    Copyright (C) 2015  Joulesmith Energy Technologies, LLC

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/



define([
    'angular',
    'utilities',
    'random_webgl'
], function (angular, utilities, random_webgl){
    "use strict";

    var app = angular.module('randomapp', []);

    app.controller('simulation', [
        '$scope',
        '$interval',
        function($scope, $interval){


            $scope.run = false;
            $scope.fps = 0;

            var spec = {
                width : 512,
                height : 512,
            };

            var simulation = random_webgl.makeRandom(spec);


            var plot = document.getElementById("plot");
            var plot_ctx = plot.getContext("2d");

            simulation.render();
            plot_ctx.drawImage(simulation.canvas, 0, 0);

            console.log("initialized");

            window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                    window.webkitRequestAnimationFrame || window.oRequestAnimationFrame;


            $scope.start = function() {
                console.log("started");

                var t_last = Date.now();
                var N_frames = 0;

                $scope.run = true;

                var step = function(){

                    simulation.step();

                    simulation.render();

                    plot_ctx.fillStyle = "rgba(0,0,0,0)";
                    plot_ctx.clearRect(0,0,spec.width, spec.height);
                    plot_ctx.drawImage(simulation.canvas, 0, 0);

                    if ($scope.run) {

                        var t_cur = Date.now();
                        N_frames++;

                        if (t_cur - t_last > 1000){
                            $scope.$apply(function(){

                                $scope.fps = (N_frames * 1000/(t_cur - t_last)).toFixed(0);
                                t_last = t_cur;
                                N_frames = 0;
                            });
                        }


                        requestAnimationFrame(step);
                    }else{
                        $scope.$apply(function(){
                            $scope.fps = 0;
                        });

                    }
                };

                requestAnimationFrame(step);
            };

            $scope.stop = function() {
                console.log("stopped");
                $scope.run = false;
            };
	}]);

    app.controller('MainCtrl', [
        '$scope',
        '$interval',
        function($scope, $interval){

	}]);

});
