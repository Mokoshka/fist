'use strict';

function block (fn) {
    var i = 250;
    while ( i ) {
        i -= 1;
        fn && fn();
    }
}

module.exports = block.bind(null, block.bind(null, block.bind(null, block)));
