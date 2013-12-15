SHELL := /bin/bash

PUBLIC=public
APPCACHE=offline.appcache
IMAGES=images/*
IMAGELIST=data/images.txt
STATIC=js/* css/* data/*

CHDIR_SHELL := $(SHELL)
define chdir
	$(eval _D=$(firstword $(1) $(@D)))
	$(info $(MAKE): cd $(_D)) $(eval SHELL = cd $(_D); $(CHDIR_SHELL))
endef

all:
	$(call chdir,$(PUBLIC))
	ls $(IMAGES) > $(IMAGELIST)
	ls $(STATIC) > .tmpfiles
	ls $(IMAGES) >> .tmpfiles
	echo "CACHE MANIFEST" > $(APPCACHE)
	echo -n "# " >> $(APPCACHE)
	cat .tmpfiles | grep -v jpg | xargs cat - | md5 >> $(APPCACHE)
	cat .tmpfiles >> $(APPCACHE)
	rm .tmpfiles
