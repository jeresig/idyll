SHELL := /bin/bash

all:
	ls public/images/* > public/data/images.txt
	echo "index.html" > .tmpfiles
	ls public/*/* >> .tmpfiles
	echo "CACHE MANIFEST" > offline.appcache
	echo -n "# " >> offline.appcache
	cat .tmpfiles | grep -v jpg | xargs cat - | md5 >> offline.appcache
	cat .tmpfiles >> offline.appcache
	rm .tmpfiles