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

heatmapApp.controller('HeatmapController', function HeatmapController($scope, $http, $q) {
    heatmapApp.run();
    
});

heatmapApp.directive('heatmap', [function() {
    function linkFunc(scope, element, attrs) {
	scope.$watch('heatmaps', function(plots) {
	    console.log("in linkfunc", element, element[0].attributes['heatmap-id'].nodeValue);	    
	    if (plots) {
		for (i=0; i < plots.length; i++) {
		    if (plots[i].id == element[0].attributes['heatmap-id'].nodeValue) {
			var layout = {
			    title: plots[i].title,
			    xaxis: {tickangle: 90,
				    tickvals: plots[i].rows.x,
				    ticktext: plots[i].rows.x},
			    yaxis: {tickvals: plots[i].rows.y,
				    ticktext: plots[i].rows.y},
			    height: 210 + 30 * (plots[i].rows.y.length),
			    width: 1024
			};
			plots[i].rows.colorbar = {
			    lenmode: "pixels",
			    len : 100
			}
			Plotly.newPlot(element[0], [plots[i].rows], layout);			
		    }
		}
	    }
	});
    }
    return {
	link: linkFunc
    };
}]);

