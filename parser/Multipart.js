'use strict';

var Dicer = /** @type Dicer */ require('dicer');
var Next = /** @type Next */ require('fist.util.next/Next');
var Parser = /** @type Parser */ require('./Parser');
var ContentType = /** @type ContentType */ require('../util/ContentType');

/**
 * @class Multipart
 * @extends Parser
 * */
var Multipart = Parser.extend(/** @lends Multipart.prototype */ {

    /**
     * @public
     * @memberOf {Multipart}
     * @method
     *
     * @returns {Next}
     * */
    parse: function (stream) {

        var next = new Next();

        Multipart._parseMultipart(stream, this.params, function () {
            next.args(arguments);
        });

        return next;
    }

}, /** @lends Multipart */ {

    /**
     * @public
     * @static
     * @memberOf Multipart
     * @property
     * @type {String}
     * */
    type: 'multipart',

    /**
     * @public
     * @static
     * @memberOf Multipart
     * @method
     *
     * @param {Object} media
     *
     * @returns {Boolean}
     * */
    matchMedia: function (media) {

        return 'multipart' === media.type;
    },

    /**
     * @protected
     * @static
     * @memberOf Multipart
     *
     * @param {Object} stream
     * @param {Object} params
     * @param {Function} done
     * */
    _parseMultipart: function (stream, params, done) {

        var parser = new Dicer(params);
        var received = 0;
        var result = [Object.create(null), Object.create(null)];

        function parserPart (part) {

            var buf = [];
            var file;
            var field;
            var mime;
            var partError = false;

            function partHeader (header) {

                var disp = (header['content-disposition'] || [])[0];

                disp = new ContentType(disp);
                field = disp.params.name;

                if ( field ) {
                    file = disp.params.filename;

                    if ( file ) {
                        mime = (header['content-type'] || [])[0];
                        mime = new ContentType(mime).getMime();
                    }

                    return;
                }

                partError = true;
            }

            function partData (chunk) {
                buf[buf.length] = chunk;
            }

            function partEnd () {

                var sect = 0;

                if ( partError ) {
                    partCleanup();

                    return;
                }

                buf = Buffer.concat(buf);

                if ( 'string' === typeof file ) {
                    sect = 1;

                    //  это был файл
                    buf = {
                        mime: mime,
                        name: file,
                        data: buf
                    };
                } else {
                    buf = String(buf);
                }

                if ( Array.isArray(result[sect][field]) ) {
                    result[sect][field].push(buf);

                } else {

                    if ( field in result[sect] ) {
                        result[sect][field] = [result[sect][field], buf];

                    } else {
                        result[sect][field] = buf;
                    }
                }

                partCleanup();
            }

            function partCleanup () {
                part.removeListener('header', partHeader);
                part.removeListener('data', partData);
                part.removeListener('end', partEnd);
            }

            part.on('header', partHeader);
            part.on('data', partData);
            part.on('end', partEnd);
        }

        function parserFinish () {

            if ( Infinity !== params.length && received !== params.length ) {
                parser.emit('error', Parser.ELENGTH({
                    actual: received,
                    expected: params.length
                }));

                return;
            }

            cleanup();
            done(null, result);
        }

        function parserError (err) {

            if ( cleanup.done ) {

                return;
            }

            if ( 'function' === typeof stream.pause ) {
                stream.pause();
            }

            cleanup();
            done(err);
        }

        function streamData (chunk) {

            if ( cleanup.done ) {

                return;
            }

            if ( !Buffer.isBuffer(chunk) ) {
                chunk = new Buffer(String(chunk));
            }

            received += chunk.length;

            if ( received > params.limit ) {
                stream.emit('error', Parser.ELIMIT({
                    actual: received,
                    expected: params.limit
                }));
            }
        }

        function cleanup () {
            parser.removeListener('part', parserPart);
            stream.removeListener('data', streamData);

            stream.removeListener('error', parserError);
            parser.removeListener('error', parserError);
            parser.removeListener('finish', parserFinish);
            cleanup.done = true;
        }

        parser.on('part', parserPart);
        stream.on('data', streamData);

        //  никогда не рушиться! (то есть не бросать исключений)
        parser.on('error', function () {});

        parser.on('error', parserError);
        stream.on('error', parserError);
        parser.on('finish', parserFinish);

        stream.pipe(parser);
    }

});

module.exports = Multipart;
