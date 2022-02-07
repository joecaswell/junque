# Makefile for certificate signing
# (c) 2014 Cornelius Kölbel corny@cornelinux.de
# GPLv3
DATA_DIR=keys
CA_DIR=${DATA_DIR}
CA_KEY=ca.key
CA_CRT=ca.crt
CA_DER=ca.der
CONF=openssl.cnf
DAYS=80
CSR_DAYS=760

CRL_DIR=${DATA_DIR}
CRL_DAYS=${DAYS}
CRL_PEM=crl.pem
CRL_DER=crl.der
CRL_REMOTE_DEST="root@yourserver:/var/ca"

CA=openssl ca -config ${CONF} -keyfile ${CA_DIR}/${CA_KEY}  -cert ${CA_DIR}/${CA_CRT}
CA_SIGN=openssl ca -keyfile ${CA_DIR}/${CA_KEY}  -cert ${CA_DIR}/${CA_CRT}

VERSION=20081129

export CDP1=http://themis/crl.crl
export CDP2=http://www.cornelinux.de/crl.crl
export KEY_CONFIG=${CONF}
export KEY_DIR=${DATA_DIR}
export KEYDIR=${DATA_DIR}
export KEY_SIZE=2048
export CA_EXPIRE=3650
export KEY_EXPIRE=760
export KEY_COUNTRY=US
export KEY_PROVINCE=Oregon
export KEY_OU=none
export KEY_CITY=Roseburg
export KEY_ORG=JoeTest
export KEY_EMAIL=joe.caswell@mongodb.com
export KEY_CN=Put a name HERE


LDAP_HOST=localhost
LDAP_BASE='dc=example, dc=com'
LDAP_USER_BASE=ou=users, dc=example, dc=com
LDAP_CA='cn=myCA, ou=certificate authority, dc=example, dc=com'
LDAP_CRL_ATTR=certificateRevocationList
LDAP_CERT_ATTR=userCertificate
LDAP_BIND='cn=admin,dc=example,dc=com'
LDAP_TMP_FILE=tmpldap
LDAP_TEMPLATE=ldap.template


help:
	@echo "Usage:"
	@echo "-------------"
	@echo "make initca"
	@echo "			Initialize CA"
	@echo
	@echo "make gencrl [ldap=1]"
	@echo "			generate CRL"
	@echo "			if ldap=1 is given, the CRL will also be published in LDAP"
	@echo 
	@echo "make publishcrl"
	@echo "			publish CRL in WWW."
	@echo
	@echo "make req ext=<extensions> name=<name>"
	@echo "			generate a request, ext= user, server, server-user, etoken, ocsp"
	@echo
	@echo "make sign csr=csr-file ext=<extensions>"
	@echo "			sign a certificate request"
	@echo 
	@echo "make etoken name=<name> size=<key size> id=<Key ID> label=<Key label>"
	@echo "			enroll an etoken for a user"
	@echo
	@echo "make extensions"
	@echo "			lists the available extensions"
	@echo
	@echo "make revoke cert=crt-file"
	@echo "			revoke a certificate"
	@echo
	@echo "make listcerts"
	@echo "			lists all issued certificates"
	@echo
	@echo "make validcerts"
	@echo "			lists all valid certificates"
	@echo
	@echo "make listrevoked"
	@echo "			lists all revoked certificates"
	@echo 
	@echo "make publishcert cn=<user> cert=<certificate serial>"
	@echo "			publish certificate in LDAP"
	@echo "			ex: make publish cert cn=koelbel cert=25"
	@echo

publishcert:
	@echo
	@echo "--------------- Publish certificate in LDAP -----------------"
	@test $${cn:?"usage: make publishcert cn=<user> cert=<cert file>"}
	@test $${cert:?"usage: make publishcert cn=<user> cert=<cert file>"}
	@echo "building ldap file from template"
	# KNOW ISSUE: this will fail, if DATA_DIR has a / in it. :(
	sed -e s/%BASE%/'cn=$(cn), ${LDAP_USER_BASE}'/ -e s/%CERT_ATTR%/${LDAP_CERT_ATTR}/g -e s/%FILE%/'${DATA_DIR}\/$(cert).der'/ ${LDAP_TEMPLATE} > ${LDAP_TMP_FILE}
	@echo "running ldapmodify"
	openssl x509 -in ${DATA_DIR}/$(cert).pem -out ${DATA_DIR}/$(cert).der -outform DER
	ldapmodify -a -D ${LDAP_BIND} -x -W -f ${LDAP_TMP_FILE}  

initca:
	@echo
	@echo "--------------- Initializing CA ------------------------------"
	openssl req -days ${CA_EXPIRE} -new -x509 -keyout ${CA_DIR}/${CA_KEY} -nodes -out ${CA_DIR}/ca.crt -config ${CONF}
	chmod 0600 ${CA_DIR}/${CA_KEY}
	touch ${DATA_DIR}/index.txt
	echo 01 > ${DATA_DIR}/serial
listcerts:
	@echo
	@echo "--------------- Issued Certficates ------------------------------"
	@for cert in $$(ls ${DATA_DIR}/??.pem); do echo -n $$cert:; openssl x509 -in $$cert -text | grep -B3 Subject:; done
	@echo

validcerts:
	@echo
	@echo "--------------- Valid Certficates ------------------------------"
	@for cert in $$(ls ${DATA_DIR}/??.pem); do openssl crl -in ${DATA_DIR}/${CRL_PEM} -text | grep "Serial Number: `basename $$cert .pem`" > /dev/null; if [ $$? -eq 1 ]; then echo -n $$cert:; openssl x509 -in $$cert -text | grep Subject:;fi; done
	@echo


listrevoked:
	@echo
	@echo "--------------- Revoked Certificates ----------------------------"
	@openssl crl -in ${CRL_DIR}/${CRL_PEM} -text | grep -A1 "Serial Number:"
	@echo

gencrl:
	@echo
	@echo "------------------ Generating CRL  ---------------------------------"
	${CA} -gencrl -out ${CRL_DIR}/${CRL_PEM} -crldays ${CRL_DAYS}
	openssl crl -in ${CRL_DIR}/${CRL_PEM} -out ${CRL_DIR}/${CRL_DER} -outform DER
	# publish at WWW
	cp ${CRL_DIR}/${CRL_PEM} /var/www
	cp ${DATA_DIR}/index.txt /var/www
	cp ${CRL_DIR}/${CRL_DER} /var/www/crl.crl
	scp ${CRL_DIR}/${CRL_DER} ${CRL_REMOTE_DEST}
	$(MAKE) validcerts > /var/www/CA/validcerts.txt
	$(MAKE) listrevoked > /var/www/CA/revoked.txt
	@if [ "$(ldap)" == "1" ]; then echo "Publish in LDAP"; sed -e s/%BASE%/${LDAP_CA}/ -e s/%CERT_ATTR%/${LDAP_CRL_ATTR}/g -e s/%FILE%/'${DATA_DIR}\/crl.der'/ ${LDAP_TEMPLATE} > ${LDAP_TMP_FILE} ; ldapmodify -a -D ${LDAP_BIND} -x -W -f ${LDAP_TMP_FILE}; fi

publishcrl:
	@echo
	@echo "------------------ Publish CRL  ---------------------------------"
	# publish at WWW
	cp ${CRL_DIR}/${CRL_PEM} /var/www
	cp ${DATA_DIR}/index.txt /var/www
	cp ${CRL_DIR}/${CRL_DER} /var/www/crl.crl
	scp ${CRL_DIR}/${CRL_DER} ${CRL_REMOTE_DEST}
        
revoke:
	@echo
	@echo "------------------ Revoking Certificate ----------------------------"
	@test $${cert:?"usage: make revoke cert=certificate"}
	${CA} -revoke ${DATA_DIR}/$(cert).pem
	@$(MAKE) gencrl

sign:
	openssl version
	@echo
	@echo "------------------ Sign Certificate Request ------------------------"
	@test $${csr:?"usage: make sign csr=<certificate request> ext=<extensions>"}
	@test $${ext:?"usage: make sign csr=<certificate request> ext=<extensions>"}
	${CA_SIGN} -config ${CONF} -extensions $(ext) -days ${CSR_DAYS} -in ${DATA_DIR}/$(csr).req -out ${DATA_DIR}/$(csr).pem
	openssl x509 -in ${DATA_DIR}/$(csr).pem -out ${DATA_DIR}/$(csr).der -outform DER

req:
	@echo
	@echo "------------------- Generating Request -----------------------------"
	@test $${ext:?"usage: make req ext=<extensions> name=<name>"}
	@test $${name:?"usage: make req ext=<extensions> name=<name>"}
	openssl req -config ${CONF} -extensions $(ext) -nodes -new -out ${DATA_DIR}/${name}.req -keyout ${DATA_DIR}/${name}.key
	@echo


extensions:
	@echo 
	@echo "------------- Available Extensions ----------------------"
	grep -B1 ^keyUsage ${CONF}

etoken:
	@echo
	@echo "------------------- Enrolling eToken -----------------------------"
	@test $${size:?"usage: make etoken name=<name> size=<key size> id=<Key ID> label=<Key label>"}
	@test $${name:?"usage: make etoken name=<name> size=<key size> id=<Key ID> label=<Key label>"}
	@test $${id:?"usage: make etoken name=<name> size=<key size> id=<Key ID> label=<Key label>"}
	@test $${label:?"usage: make etoken name=<name> size=<key size> id=<Key ID> label=<Key label>"}
	@echo =============================
	@echo Generating Key Pair on eToken
	@echo RSA $(size) bit
	@echo =============================
	pkcs11-tool --module /usr/lib/libeTPkcs11.so -k --key-type rsa:$(size) -l --id $(id)  --label $(label)
	@echo =============================
	@echo Building Cert Req
	@echo =============================
	openssl req -config ${CONF} -engine pkcs11 -new -key id_$(id) -keyform engine -out ${DATA_DIR}/$(name).req -outform PEM
	@echo =============================
	@echo Signing Request
	@echo =============================
	@$(MAKE) sign csr=$(name) ext=etoken
	@echo =============================
	@echo Loading cert to the token
	@echo =============================
	pkcs11-tool --module /usr/lib/libeTPkcs11.so  -w ${DATA_DIR}/$(name).der -y cert -l --slot 0 --id $(id)  -a $(label)

	
