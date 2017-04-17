INSDIR=/var/www/html/microarray_heatmaps

install: heatmap.js index.html
	mkdir -p $(INSDIR)
	cp heatmap.js index.html $(INSDIR)/
	mkdir -p $(INSDIR)/vendor
	cp vendor/plotly-latest.min.js $(INSDIR)/vendor
