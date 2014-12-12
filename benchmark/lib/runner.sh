#!/bin/sh

for benchmark in $*; do

    node ${benchmark} &
    pid=$!;

    echo ${pid} ${benchmark};

    sleep 2;

    wrk "http://localhost:1337/index/?foo=bar&baz=zot" -d 20 -c 50 -t 8 | grep "/sec";

    kill ${pid};

    echo;

    sleep 3;

done;
