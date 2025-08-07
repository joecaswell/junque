#!/bin/bash

if [ $1 == "-h" ]; then
    echo -e "Usage:\n\t[SHARDLIST=] [NODELIST=] [SHARDS=] [NODES=] $(basename $0) [inputfile [outputfile]]"
    cat - << EOF
    Defaults:
       SHARDS=1 #shard 00 only
       NODES=3  #nodes 00 - 02
       NODELIST=unset # Comma or space separated list of node "00-03,04-01,15-04"
       SHARDLIST=unset # Comma or space separated list of shard numbers "00,04,15" (used with NODES above)
EOF
    exit
fi

infile=${1:-"template.html"}
outfile=${2:-"out.html"}

if [ ! -f "$infile" ]; then
    echo "huh?"; 
    exit;
fi


if [ -z "$NODELIST" ];
then
  SHARDS=${SHARDS:-01}
  NODES=${NODES:-03}

  if [ -n "$SHARDLIST" ]; then
      IFS=", " SHARDS=(${SHARDLIST});
  fi

  (for shard in $(seq -w 00 $((${SHARDS}-1))); do for node in $(seq -w 00 $((${NODES}-1))); do cat $infile | shard=$shard node=$node envsubst; done; done) > $outfile

else
  IFS=", " NODES=(${NODELIST})
  for NODE in ${NODES[*]}; do
    echo "$NODE" | ( 
       IFS="-_" read shard node
       cat $infile | shard=$shard node=$node envsubst
    );
  done > $outfile
fi
#[ -f "$outfile" ] && explorer.exe "$outfile"
