#!/bin/bash

# terminate on error
set -e

# file name and a directory to unpack it into
fn=$1
dn=$fn.d

# location of t2
t2=$(pwd)/t2

# make a directory
rm -rf $dn
mkdir -p $dn
pushd $dn

# unpack into that directory
if [[ "$fn" =~ (\.tgz|\.tar\.gz|\.tar)$ ]]; then
    tar xf ../$(basename $fn)
elif [[ "$fn" =~ \.zip$ ]]; then
    unzip ../$(basename $fn)
else
    echo unknown file type $fn
    exit -1
fi

# run t2 on the unpacked file
popd
$(dirname $0)/t2 $dn


