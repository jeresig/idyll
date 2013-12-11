all:
	cp default.appcache active.appcache
	ls images/* >> active.appcache
	ls images/* > images.txt
