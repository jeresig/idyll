SHELL := /bin/bash

APPCACHE=public/offline.appcache
IMAGES=public/images/*
IMAGELIST=public/data/images.txt
STATIC=public/*/*

all:
	ls $(IMAGES) > $(IMAGELIST)
	ls $(STATIC) >> .tmpfiles
	echo "CACHE MANIFEST" > $(APPCACHE)
	echo -n "# " >> $(APPCACHE)
	cat .tmpfiles | grep -v jpg | xargs cat - | md5 >> $(APPCACHE)
	cat .tmpfiles >> $(APPCACHE)
	rm .tmpfiles
