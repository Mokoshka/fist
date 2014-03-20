'use strict';

var Parser = /** @type Parser */ require('./Parser');
var Next = /** @type Next */ require('fist.util.next/Next');

/**
 * @class Raw
 * @extends Parser
 * */
var Raw = Parser.extend(/** @lends Raw.prototype */ {

    /**
     * @protected
     * @memberOf {Raw}
     * @method
     *
     * */
    parse: function (stream) {
        var next = new Next();

        Raw.download(stream, this.params, function () {
            next.args(arguments);
        });

        return next;
    }

}, {

    /**
     * @public
     * @static
     * @memberOf Raw
     * @method
     *
     * @param {Object} stream
     * @param {Object} params
     * @param {Function} done
     * */
    download: function (stream, params, done) {

        var buf = [];
        var received = 0;

        function cleanup () {
            stream.removeListener('data', data);
            stream.removeListener('error', error);
            stream.removeListener('end', end);
            stream.removeListener('close', cleanup);
        }

        function data (chunk) {

            if ( !Buffer.isBuffer(chunk) ) {
                chunk = new Buffer(String(chunk));
            }

            received += chunk.length;

            if ( received > params.limit ) {
                stream.emit('error', Parser.ELIMIT({
                    expected: params.limit,
                    actual: received
                }));

                return;
            }

            buf[buf.length] = chunk;
        }

        function error (err) {

            if ( 'function' === typeof stream.pause ) {
                stream.pause();
            }

            cleanup();
            done(err);
        }

        function end () {

            if ( Infinity !== params.length && received !== params.length ) {
                stream.emit('error', Parser.ELENGTH({
                    expected: params.length,
                    actual: received
                }));

                return;
            }

            cleanup();
            done(null, Buffer.concat(buf));
        }

        stream.on('data', data);
        stream.on('error', error);
        stream.on('end', end);
        stream.on('close', cleanup);
    }
});

module.exports = Raw;
