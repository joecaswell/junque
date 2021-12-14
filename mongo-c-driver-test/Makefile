MONGOVERSION=4.0.27
DRIVERVERSION=1.16.2
DRIVERDIR=$(PWD)/mongo-c-driver.$(DRIVERVERSION)
DBPATH=$(PWD)/mongod
LOGFILE=$(DBPATH)/mongod.log
KEYFILE=$(DBPATH)/keyfile
PIDFILE=$(DBPATH)/mongod.pid
CONFIGUREOPTS=--prefix=$(DRIVERDIR) --disable-automatic-init-and-cleanup --with-libbson=bundled
OPENSSLROOT=/usr/local/Cellar/openssl/1.0.2o_2
MONGOKEY=FJAeZMv8ffj20w50ZsxscQ27Z8tAYU2V0rXeffvVU2He4LN3Zopc87m4qlHTHhc4VmUEbj7IDhSMB7k7IwRUdg

MONGODOPTS=--dbpath $(DBPATH) --setParameter=enableLocalhostAuthBypass=0 --logpath $(DBPATH)/mongod.log --fork --keyFile $(KEYFILE) --replSet 5E79011A-7B0C-487B-918E-F3CC147383CD --pidfilepath $(PIDFILE) -vvvvv --networkMessageCompressors disabled

.PHONY: run test clear kill killall select test-$(DRIVERVERSION) 

run: test kill 
	
test: clear $(DBPATH) $(KEYFILE) select test-$(DRIVERVERSION)
	mongod $(MONGODOPTS)
	DYLD_LIBRARY_PATH=$(DRIVERDIR)/lib ./test-$(DRIVERVERSION) || :
	cp $(LOGFILE) mongod-$(MONGOVERSION)-$(DRIVERVERSION)-$(shell date +%Y-%m-%dT%H-%M-%S).log

help:
	@echo "Usage:"
	@echo "    make run (default) - execute test"
	@echo "    make clear - stop mongod and remove dbpath"
	@echo "    make kill - stop mongod using pidfile"
	@echo "    make killall - stop all mongod processes"
	@echo "    make select - set mongodb binaries to the selected version"
	@echo "    make test.c - create test.c source file if it doesn't already exist"
	@echo "    make test-<driverversion> - compile test.c using the specified version of the driver"
	@echo " All rules will accept MONGOVERSION=x.x.x and DRIVERVERSION=x.x.x"

clear: kill
	[ -n "$(DBPATH)" ]
	[ ! $(DBPATH) = / ]
	[ -e $(DBPATH) ] && rm -rf $(DBPATH) || :

kill: 
	$(eval PID=$(shell cat $(PIDFILE) || echo "")) 
	if [ -n "$(PID)" ]; then while kill -0 $(PID) &>/dev/null; do kill $(PID); sleep 1; done; fi 

killall:
	while pgrep mongod; do pkill mongod; sleep 0.1; done

select:
	@which m && m $(MONGOVERSION) || echo "m not available"

$(DBPATH):
	mkdir $(DBPATH)

$(KEYFILE):
	echo "$(MONGOKEY)" > $(KEYFILE)
	chmod 700 $(KEYFILE)

test-$(DRIVERVERSION): test.c $(DRIVERDIR)/lib/libmongoc-1.0.dylib
	gcc test.c -I $(DRIVERDIR)/include/libmongoc-1.0 -I $(DRIVERDIR)/include/libbson-1.0 -L $(DRIVERDIR)/lib -lbson-1.0 -lmongoc-1.0 -o test-$(DRIVERVERSION)

test.c:
	@echo '#include <stdio.h>' >> $@
	@echo '#include <unistd.h>' >> $@
	@echo '' >> $@
	@echo '#include <mongoc.h>' >> $@
	@echo '' >> $@
	@echo '#define DBNAME "test"' >>$@
	@echo '#define COLNAME "test"' >> $@
	@echo '#define NAMESPACE DBNAME "." COLNAME' >> $@
	@echo '' >> $@
	@echo 'enum optypes{insert_op, delete_op, update_op};' >> $@
	@echo '' >> $@
	@echo 'void printConstants() {' >> $@
	@echo '    printf("\\n**********\\n");' >> $@
	@echo '    printf("Testing with: \\ndatabase name: %s,(%lu)\\n", DBNAME, strlen(DBNAME));' >> $@
	@echo '    printf("collection name: %s(%lu)\\n", COLNAME, strlen(COLNAME));' >> $@
	@echo '    printf("namespace: %s(%lu)\\n", NAMESPACE, strlen(NAMESPACE));' >> $@
	@echo '    printf("**********\\n\\n");' >> $@
	@echo '}' >> $@
	@echo '' >> $@
	@echo 'bool runCommand(mongoc_client_t *client, const char *db_name, const char *json, char **retstring, bson_t *retval)' >> $@
	@echo '{' >> $@
	@echo '  bson_error_t error;' >> $@
	@echo '  bson_t doc;' >> $@
	@echo '  bson_t *reply;' >> $@
	@echo '  char *s;' >> $@
	@echo '  char **str;' >> $@
	@echo '' >> $@
	@echo '  if (retstring == NULL) {' >> $@
	@echo '      str = &s;' >> $@
	@echo '  } else {' >> $@
	@echo '      str = retstring;' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  if (retval == NULL) {' >> $@
	@echo '      reply = &doc;' >> $@
	@echo '  } else {' >> $@
	@echo '      reply = retval;' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  if (!client) {' >> $@
	@echo '      fprintf(stderr, "[ERROR] no client to run %s\\n", json);' >> $@
	@echo '      return false;' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  bson_t *command = bson_new_from_json((const uint8_t *)json, -1, &error);' >> $@
	@echo '  if (!command) {' >> $@
	@echo '      fprintf(stderr, "[ERROR] %s\\n", error.message);' >> $@
	@echo '      fprintf(stderr, "%s\\n", json);' >> $@
	@echo '      return false;' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  s = bson_as_json(command, NULL);' >> $@
	@echo '  printf("[COMMAND] %s\\n", s);' >> $@
	@echo '  bson_free(s);' >> $@
	@echo '' >> $@
	@echo '  if (!mongoc_client_command_simple(client, db_name, command, NULL, reply, &error)) {' >> $@
	@echo '      fprintf(stderr, "[ERROR] %s\\n", error.message);' >> $@
	@echo '      return false;' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  *str = bson_as_json(reply, NULL);' >> $@
	@echo '  printf("[REPLY] %s\\n", *str);' >> $@
	@echo '' >> $@
	@echo '  if (retstring == NULL) {' >> $@
	@echo '      bson_free(*str);' >> $@
	@echo '  }' >> $@
	@echo '' >> $@
	@echo '  return true;' >> $@
	@echo '}' >> $@
	@echo '' >> $@
	@echo 'bool runDataOp(enum optypes optype, mongoc_client_t* client, const char *db_name, const char *collection_name, const char *json)' >> $@
	@echo '{' >> $@
	@echo '	bson_error_t error;' >> $@
	@echo '	char *str;' >> $@
	@echo '	bool retval;' >> $@
	@echo '' >> $@
	@echo '	if (!client) {' >> $@
	@echo '        fprintf(stderr, "[ERROR] no client to run %s\\n", json);' >> $@
	@echo '        return false;' >> $@
	@echo '	}' >> $@
	@echo '' >> $@
	@echo '	mongoc_collection_t *collection = mongoc_client_get_collection(client, db_name, collection_name);' >> $@
	@echo '	if (!collection) {' >> $@
	@echo '        fprintf(stderr, "[ERROR] unable to get collection %s\\n", collection_name);' >> $@
	@echo '        return false;' >> $@
	@echo '	}' >> $@
	@echo '' >> $@
	@echo '	bson_t *command = bson_new_from_json((const uint8_t *)json, -1, &error);' >> $@
	@echo '	if (!command) {' >> $@
	@echo '		fprintf(stderr, "[ERROR] %s\\n", error.message);' >> $@
	@echo '		return false;' >> $@
	@echo '	}' >> $@
	@echo '' >> $@
	@echo '	str = bson_as_json(command, NULL);' >> $@
	@echo '' >> $@
	@echo '    switch (optype) {' >> $@
	@echo '        case insert_op:' >> $@
	@echo '            printf("[DATA] insert %s into %s.%s\\n", str, db_name, collection_name);' >> $@
	@echo '            retval = mongoc_collection_insert(collection, MONGOC_INSERT_NONE, command, NULL, &error);' >> $@
	@echo '            break;' >> $@
	@echo '        case delete_op:' >> $@
	@echo '            printf("[DATA] delete %s from %s.%s\\n", str, db_name, collection_name);' >> $@
	@echo '            retval = mongoc_collection_remove(collection, MONGOC_REMOVE_NONE, command, NULL, &error);' >> $@
	@echo '            break;' >> $@
	@echo '        case update_op:' >> $@
	@echo '            printf("Update not yet implemented\\n");' >> $@
	@echo '            break;' >> $@
	@echo '    }' >> $@
	@echo '' >> $@
	@echo '	if (!retval) {' >> $@
	@echo '		fprintf(stderr, "[ERROR] %s\\n", error.message);' >> $@
	@echo '		return false;' >> $@
	@echo '	}' >> $@
	@echo '' >> $@
	@echo '	mongoc_collection_destroy(collection);' >> $@
	@echo '	bson_free(str);' >> $@
	@echo '	return true;' >> $@
	@echo '}' >> $@
	@echo '' >> $@
	@echo 'bool waitForMaster(mongoc_client_t* client) {' >> $@
	@echo '    char *str;' >> $@
	@echo '' >> $@
	@echo '	while (true) {' >> $@
	@echo '		const char *isMaster = "{ \\"isMaster\\": 1 }";' >> $@
	@echo '		if (!runCommand(client, "admin", isMaster, &str, NULL)) {' >> $@
	@echo '			return false;' >> $@
	@echo '		}' >> $@
	@echo '' >> $@
	@echo '		if (strstr(str, "\\"ismaster\\" : true") != NULL) {' >> $@
	@echo '			break;' >> $@
	@echo '		}' >> $@
	@echo '		sleep(1);' >> $@
	@echo '	}' >> $@
	@echo '' >> $@
	@echo '    bson_free(str);' >> $@
	@echo '    return true;' >> $@
	@echo '}' >> $@
	@echo '' >> $@
	@echo 'bool initReplicaSet(const char *uri) ' >> $@
	@echo '{' >> $@
	@echo '    bool retval;' >> $@
	@echo '    mongoc_client_t *client = mongoc_client_new(uri);' >> $@
	@echo '' >> $@
	@echo '	const char *replInit = "{ \\"replSetInitiate\\": { \\"_id\\": \\"5E79011A-7B0C-487B-918E-F3CC147383CD\\","' >> $@
	@echo '                                                    "\\"members\\": ["' >> $@
	@echo '                                                        "{ \\"_id\\": 0,"' >> $@
	@echo '                                                          "\\"host\\": \\"127.0.0.1:27017\\","' >> $@
	@echo '                                                          "\\"votes\\": 1,"' >> $@
	@echo '                                                          "\\"priority\\": 1}"' >> $@
	@echo '                                                    "]}}";' >> $@
	@echo '	if (!runCommand(client, "admin", replInit, NULL, NULL)) {' >> $@
	@echo '		return false;' >> $@
	@echo '    }' >> $@
	@echo '    retval = waitForMaster(client);' >> $@
	@echo '	mongoc_client_destroy(client);' >> $@
	@echo '    return retval;' >> $@
	@echo '}' >> $@
	@echo '' >> $@
	@echo 'int main()' >> $@
	@echo '{' >> $@
	@echo '    mongoc_collection_t *collection;' >> $@
	@echo '' >> $@
	@echo '	mongoc_init();' >> $@
	@echo '' >> $@
	@echo '	const char *standaloneUri = "mongodb://__system:$(MONGOKEY)@localhost:27017/?authSource=local";' >> $@
	@echo '' >> $@
	@echo '    if (!initReplicaSet(standaloneUri)) {' >> $@
	@echo '        return EXIT_FAILURE;' >> $@
	@echo '    }' >> $@
	@echo '' >> $@
	@echo '	mongoc_uri_t* uri = mongoc_uri_new(standaloneUri);' >> $@
	@echo '	mongoc_client_pool_t* pool = mongoc_client_pool_new(uri);' >> $@
	@echo '	mongoc_uri_destroy(uri);' >> $@
	@echo '' >> $@
	@echo '    // replica set is up and ready, start real test' >> $@
	@echo '' >> $@
	@echo '	mongoc_client_t *client = mongoc_client_pool_pop(pool);' >> $@
	@echo '    ' >> $@
	@echo '    printConstants();' >> $@
	@echo '' >> $@
	@echo '    const char *indexcmd = "{ \\"createIndexes\\": \\"" COLNAME "\\","' >> $@
	@echo '                                 "\\"indexes\\":["' >> $@
	@echo '                                     "{ \\"key\\":{\\"FIELDNAME\\":1},"' >> $@
	@echo '                                     "  \\"name\\":\\"INDEXNAME\\"}]}";' >> $@
	@echo '' >> $@
	@echo '    if (!runCommand(client, DBNAME, indexcmd, NULL, NULL)) {' >> $@
	@echo '        return EXIT_FAILURE;' >> $@
	@echo '    }' >> $@
	@echo '  ' >> $@
	@echo '    const char *insert = "{ \\"FIELDNAME\\": \\"value\\"}";' >> $@
	@echo '    if (!runDataOp(insert_op,client, DBNAME, COLNAME, insert)) {' >> $@
	@echo '        return EXIT_FAILURE;' >> $@
	@echo '    }' >> $@
	@echo '' >> $@
	@echo '    const char *dropdb = "{ \\"dropDatabase\\": 1 }";' >> $@
	@echo '    if (!runCommand(client, DBNAME, dropdb, NULL, NULL)) {' >> $@
	@echo '        return EXIT_FAILURE;' >> $@
	@echo '    }' >> $@
	@echo '' >> $@
	@echo '    mongoc_client_destroy(client);' >> $@
	@echo '    printf("*** Success ***\\n");' >> $@
	@echo '	return EXIT_SUCCESS;' >> $@
	@echo '}' >> $@
	@echo '' >> $@

$(DRIVERDIR)/lib/libmongoc-1.0.dylib: $(PWD)/mongo-c-driver-$(DRIVERVERSION)
	( cd $<;\
	if [ -e "configure" ]; then \
	 ./configure $(CONFIGUREOPTS);\
	 make install;\
	else\
	 mkdir cmake-build;\
	 cd cmake-build;\
	 OPENSSL_ROOT_DIR=$(OPENSSLROOT) cmake -DCMAKE_INSTALL_PREFIX:PATH=$(DRIVERDIR) ..;\
	 make install;\
	fi;\
	 )

$(PWD)/mongo-c-driver-$(DRIVERVERSION):
	curl -LO https://github.com/mongodb/mongo-c-driver/releases/download/$(DRIVERVERSION)/mongo-c-driver-$(DRIVERVERSION).tar.gz
	tar -xvzf mongo-c-driver-$(DRIVERVERSION).tar.gz
