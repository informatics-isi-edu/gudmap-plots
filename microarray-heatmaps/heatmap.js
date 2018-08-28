var heatmapApp =
    angular.module('heatmapApp', [
        'ngSanitize',
        'ngCookies',
        'chaise.utils',
        'ermrestjs',
        'ui.bootstrap'])
    .factory('constants', [function(){
        return {
            defaultPageSize: 25,
        };
    }])

    .config(['$cookiesProvider', function($cookiesProvider) {
        $cookiesProvider.defaults.path = '/';
    }])

    // Configure all tooltips to be attached to the body by default. To attach a
    // tooltip on the element instead, set the `tooltip-append-to-body` attribute
    // to `false` on the element.
    .config(['$uibTooltipProvider', function($uibTooltipProvider) {
        $uibTooltipProvider.options({appendToBody: true});
    }])

    .run(['constants', 'DataUtils', 'ERMrest', 'ErrorService', 'headInjector', 'Session', 'UiUtils', 'UriUtils', '$log', '$rootScope', '$window',
          function runApp(constants, DataUtils, ERMrest, ErrorService, headInjector, Session, UiUtils, UriUtils, $log, $rootScope, $window) {
		  var context = {};
              context = $rootScope.context = UriUtils.parseURLFragment($window.location, context);
	      console.log(context);	    
              ERMrest.appLinkFn(UriUtils.appTagToURL);
              var ermrestURI = UriUtils.chaiseURItoErmrestURI($window.location);
	      console.log("uri: ", ermrestURI);
	      var heatmaps = [];
	      ERMrest.resolve(ermrestURI).then(
    		  function(reference) {
//		      var ref = reference.contextualize.detailed;
		      var ref = reference.sort([{"column" : "Section_Ordinal", "descending" : false},
						{"column" : "Probe_Set_Name", "descending" : false},
						{"column" : "Ordinal", "descending" : false}]);
		      var y = 0;
		      page = ref.read(1000);
		      function titlecallback(tuple) {
			  return(tuple.data.Section);
		      }
		      function idcallback(tuple) {
			  return(tuple.data.ID);
		      }
		      function xcallback(tuple) {
			  return(tuple.data.Label);
		      }		      
		      function ycallback(tuple) {
			  return(tuple.data.Probe_Set_Name);
		      }
		      function zcallback(tuple) {
			  return(tuple.data.Value);
		      }		      
		      function makeHeatmapData(heatmaps, xcallback, ycallback, zcallback, titlecallback, idcallback) {
			  return function heatmapData(tuple) {
			      var hm = null;
			      var x = xcallback(tuple);			      
			      var y = ycallback(tuple);
			      var z = zcallback(tuple);
			      var title = titlecallback(tuple);
			      var id = idcallback(tuple);
			      for(var i=0; i < heatmaps.length; i++) {
				  if (heatmaps[i].title == title) {
				      heatmaps[i].id=id;
				      hm = heatmaps[i];
				  }
			      }				  
			      if (hm == null) {
				  hm = {'title' : title, 'rows' : {y : [], x : [], z : [], type : 'heatmap'}};
				  heatmaps.push(hm);  
			      }
			      var rowIndex = hm.rows.y.indexOf(y);
			      if (rowIndex < 0) {
				  hm.rows.y.push(y);
				  hm.rows.z.push([]);				  
				  rowIndex = hm.rows.y.indexOf(y);
			      }
			      hm.rows.x.push(x);
			      hm.rows.z[rowIndex].push(z);
			      return(heatmaps);
			  }
		      }
		      var addData = makeHeatmapData(heatmaps, xcallback, ycallback, zcallback, titlecallback, idcallback);
		      readAll = function readAll(page) {
			  for (var i = 0; i < page.tuples.length; i++) {
			      addData(page.tuples[i]);			      
			  }
			  if (page.hasNext) {
			      ary = page.next.read(1000).then(readAll);
			  } else {
			      console.log("heatmaps: ", heatmaps);
			      $rootScope.heatmaps=heatmaps;
				  $rootScope.heatmapRows = heatmaps[0].rows;
			  }
			  return(heatmaps);
		      };
		      page.then(readAll);
		  },
    		  function(error) {
    		      alert('error');
    		  })
	  }
	 ])
;

heatmapApp.controller('HeatmapController', function HeatmapController($scope, $http, $q, $rootScope) {
	$rootScope.heatmapsLoadedCount = 0;
	$scope.allHeatmapsLoaded = false;
	heatmapApp.run();	
	$scope.showHeatmaps = function(){
		$scope.$apply(function(){
			$scope.allHeatmapsLoaded = true;
		});
	};    
});

heatmapApp.factory('HeatmapUtils', function HeatmapUtils() {
	/**	 
	 * @param {object} input : Input parameters of heatmap directive
	 * @param {number} longestXTick : Length of longest X axis label
	 * @param {number} lengthY : Number of Y values
	 * Calculates the height and margins of the heatmap based on the number of y values and length of the longest X label
	 * so that the labels do not get clipped and the bar height is adjusted accordingly.
	 * Return an object with all the required layout parameters.
	 * @example
	 * {
	 * 	height: height of the heatmap,
	 * 	width: width of the heatmap,
	 * 	margin: {
	 * 		t: top margin of the heatmap,
	 * 		r: right margin of the heatmap,
	 * 		b: bottom margin of the heatmap,
	 * 		l: left of the heatmap
	 * 	},
	 * 	xTickAngle: inclination of x axis labels,
	 *  yTickAngle: inclination of y axis labels,
	 * 	tickFont: font to be used in labels
	 * }
	 */
	function getLayoutParams(input, longestXTick, longestYTick, lengthY) {
		var height;
		var yTickAngle;
		var tMargin = 25, rMargin, bMargin, lMargin;

		if(longestXTick <= 18){
		    height = longestXTick * 8 + lengthY * 10 + 45;
		    bMargin = 7.8 * longestXTick;
		} else if(longestXTick <= 22){
			height = longestXTick * 8.7 + lengthY * 10 + 35;
			bMargin = 6.9 * longestXTick;
		} else if(longestXTick <= 30){
			height = longestXTick * 7.7 + lengthY * 10 + 45;
			bMargin = 6.7 * longestXTick;
		} else{			
			height = longestXTick * 7.2 + lengthY * 10 + 42; 
			bMargin = 6.3 * longestXTick;
		}
		
		if (lengthY == 1) {
			yTickAngle = -90;
			lMargin = 30;
			rMargin = 20;
		} else {
			yTickAngle = 0;
			lMargin = 20 + longestYTick * 7;
			rMargin = 5;
		}

		var layoutParams = {
			height: height,
			width: input.width,
			margin: {
				t: tMargin,
				r: rMargin,
				b: bMargin,
				l: lMargin,
			},
			xTickAngle: input.xTickAngle,
			yTickAngle: yTickAngle,
			tickFont: input.tickFont
		};
		return layoutParams;
	}

	return {
		getLayoutParams: getLayoutParams
	};
});

/**
 * Directive <heatmap> is used to display a heatmap of a given dataset in (x,y,z) format
 * It can have following attributes:
 * @param {number} width: width of the heatmap in pixels. To avoid horizontal scroll should be same as the width of the enclosing iframe
 * @param {number} xTickAngle: Inclination of the X axis labels
 * @param {string} tickFontFamily: Font family of the axis labels, both x and y
 * @param {number} tickFontSize: Font size of the axis labels, both x and y
 * @example: 
 * <heatmap heatmap-id="{{heatmap.id}}" width=1200 x-tick-angle=50 tick-font-family="Helvetica" tick-font-size=12>
 * </heatmap>
 */
heatmapApp.directive('heatmap', ['HeatmapUtils', '$rootScope', function(HeatmapUtils, $rootScope) {
	function linkFunc(scope, element, attrs) {
		scope.$watch('heatmaps', function(plots) {
			console.log("in linkfunc", element, element[0].attributes['heatmap-id'].nodeValue);
			if (plots) {
				for (i=0; i < plots.length; i++) {
					if (plots[i].id == element[0].attributes['heatmap-id'].nodeValue) {
						var longestXTick = plots[i].rows.x.reduce(function(a, b) { return a.length > b.length ? a : b;});
						var longestYTick = plots[i].rows.y.reduce(function(a, b) { return a.length > b.length ? a : b;});
						var inputParams = {
							width: typeof attrs.width !== "undefined" ? attrs.width : 1200,
							xTickAngle: typeof attrs.xTickAngle !== "undefined" ? attrs.xTickAngle : 50,
							tickFont: {
								family: typeof attrs.tickFontFamily !== "undefined" ? attrs.tickFontFamily : 'Arial',
								size: typeof attrs.tickFontSize !== "undefined" ? attrs.tickFontSize : 12
							}
						};
						var layoutParams = HeatmapUtils.getLayoutParams(inputParams, longestXTick.length, longestYTick.length, plots[i].rows.y.length);

						var layout = {
							title: plots[i].title,
							xaxis: {
								tickangle: layoutParams.xTickAngle,
								tickfont: layoutParams.tickFont,
								tickvals: plots[i].rows.x,
								ticktext: plots[i].rows.x,
							},
							yaxis: {
								tickangle: layoutParams.yTickAngle,
								tickvals: plots[i].rows.y,
								ticktext: plots[i].rows.y,
								tickfont: layoutParams.tickFont
							},
							margin: layoutParams.margin,
							height: layoutParams.height,
							width: layoutParams.width
						};
						plots[i].rows.colorbar = {
							lenmode: "pixels",
							len: layoutParams.height - 40 < 100 ? layoutParams.height -40 : 100 
						}
						Plotly.newPlot(element[0], [plots[i].rows], layout).then(function(){
							$rootScope.heatmapsLoadedCount++;
							if($rootScope.heatmapsLoadedCount == this){
								scope.showHeatmaps();
							}
						}.bind(plots.length));
					}
				}
			}
		});
	}
	return {
		link: linkFunc
	};
}]);

