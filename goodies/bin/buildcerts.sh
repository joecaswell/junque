#!/bin/bash
s=${s:-0}
openssl req -newkey rsa:1024 -nodes -batch -keyout ca.key -new -subj "/CN=CA Test" -x509 2>/dev/null > ca.crt
openssl x509 -signkey ca.key -in ca.crt -CA ca.crt -CAkey ca.key -set_serial $s -noout
for B in rs{1..3}.local client.local;
do
    s=$(($s+1))
    openssl req -newkey rsa:1024 -nodes -batch -keyout ${B}.pem -new -subj "/CN=$B" 2>/dev/null | \
    openssl x509 -req -CA ca.crt -CAkey ca.key -set_serial $s >> ${B}.pem 2> /dev/null
done
for c in *.pem
do
    set -x
    openssl verify -CAfile ca.crt $c
    set +x
done
