#!/bin/sh

for benchmark in $*; do

    node ${benchmark} &
    pid=$!;

    echo ${pid} ${benchmark};

    sleep 2;

    ab -c 50 -t 60 -n 50000 "http://localhost:1337/index/?foo=bar&baz=zot" | grep "/sec";

    kill ${pid};

    echo;

    sleep 3;

done;
