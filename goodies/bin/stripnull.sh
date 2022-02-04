#!/bin/bash
if [ $# -eq 1 -a -f "$1" ];
then
    tmp="${1}.tmp";
    i=0;
    while [ -f "$tmp" ]; 
    do
        tmp="${1}${i}.tmp";
        i=$(($+1))
    done
    cat "$1" | stripnull > "$tmp"
    res=$?
    if [ 0 -eq $res ];
    then
        mv "$tmp" "$1"
    else
        echo "Error $res stripping leading nulls"
    fi
else
    echo "Usage: $0 <filename>"
fi

