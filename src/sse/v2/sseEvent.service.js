import EventEmitter from 'events';
import _ from "lodash";

class SseEvent extends EventEmitter {

    constructor(initial, options = {}) {
        super();
        this.initial = initial || [];
        if (!_.isEmpty(options))
            this.options = {  ...options ,  keepaliveInterval: 15000, keepaliveMessage: 'ping' }; // added keepaliveInterval , keepAliveMessage
        else
            this.options = { isSerialized: true , keepaliveInterval: 15000, keepaliveMessage: 'ping'}; // added keepaliveInterval , keepAliveMessage

        this.init = this.init.bind(this);
    }

    /**
     * The SSE route handler
     */
    init(req, res) {
        let id = 0;
        let listenerAttached = false; // Track if any listener is attached

        req.socket.setTimeout(0);
        req.socket.setNoDelay(true);
        req.socket.setKeepAlive(true);

        res.statusCode = 200;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        if (req.httpVersion !== '2.0')
            res.setHeader('Connection', 'keep-alive');

        if (this.options.isCompressed)
            res.setHeader('Content-Encoding', 'deflate');

        // Increase number of event listeners on init
        this.setMaxListeners(this.getMaxListeners() + 2);

        // ✅ Timeout to close the connection if no listener is attached within 60 seconds
        const closeTimeout = setTimeout(() => {
            if (!listenerAttached) {
                console.log("Closing SSE connection due to no listener within 60 seconds");
                res.end();
            }
        }, 60000); // 60 seconds

        // Add keepalive interval - Added this one
        const keepaliveTimer = setInterval(() => {
            res.write(`id: \nevent: keepalive\ndata: ${JSON.stringify({messageId: "", count: 0})}\n\n`);
        }, this.options.keepaliveInterval);

        // Add connection detection
        const detectDisconnection = setInterval(() => {
            if (res.writableEnded || !res.writableFinished) {
                clearInterval(keepaliveTimer);
                clearInterval(detectDisconnection);
                clearTimeout(closeTimeout); // ✅ Clear timeout if connection is closed
                req.emit('close');
            }
        }, 30000);

        // Add error handling
        res.on('error', (error) => {
            clearInterval(keepaliveTimer);
            clearInterval(detectDisconnection);
            clearTimeout(closeTimeout);
            this.emit('error', error);
        });

        const dataListener = data => {
            listenerAttached = true; // ✅ Mark that a listener is attached
            clearTimeout(closeTimeout); // ✅ Clear timeout since a listener is attached

            if (data.id)
                res.write(`id: ${data.id}\n`);
            else {
                res.write(`id: ${id}\n`);
                id += 1;
            }

            if (data.event)
                res.write(`event: ${data.event}\n`);

            res.write(`data: ${JSON.stringify(data.data)}\n\n`);
        };

        const serializeListener = data => {
            listenerAttached = true; // ✅ Mark that a listener is attached
            clearTimeout(closeTimeout); // ✅ Clear timeout since a listener is attached

            const serializeSend = data.reduce((all, msg) => {
                all += `id: ${id}\ndata: ${JSON.stringify(msg)}\n\n`;
                id += 1;
                return all;
            }, '');
            res.write(serializeSend);
        };

        this.on('data', dataListener);

        this.on('serialize', serializeListener);

        if (this.initial) {
            if (this.options?.isSerialized)
                this.serialize(this.initial);
            else if (!_.isEmpty(this.initial))
                this.send(this.initial,
                    this.options.initialEvent || false,
                    this.options.eventId
                );
        }

        // Remove listeners and reduce the number of max listeners on client disconnect
        req.on('close', () => {
            clearInterval(keepaliveTimer); // added this line
            clearInterval(detectDisconnection); // Add this line
            clearTimeout(closeTimeout); // ✅ Ensure timeout is cleared on disconnect
            this.removeListener('data', dataListener);
            this.removeListener('serialize', serializeListener);
            this.setMaxListeners(this.getMaxListeners() - 2);
        });
    }

    /**
     * Update the data initially served by the SSE stream
     * @param {array} data array containing data to be served on new connections
     */
    updateInit(data) {
        this.initial =  data;
    }

    /**
     * Empty the data initially served by the SSE stream
     */
    dropInit() {
        this.initial = [];
    }

    /**
     * Send data to the SSE
     * @param {(object|string)} data Data to send into the stream
     * @param [string] event Event name
     * @param [(string|number)] id Custom event ID
     */
    send(data, event, id) {
        this.emit('data', { data, event, id });
    }

    /**
     * Send serialized data to the SSE
     * @param {array} data Data to be serialized as a series of events
     */
    serialize(data) {
        if (Array.isArray(data)) {
            this.emit('serialize', data);
        } else {
            this.send(data);
        }
    }
}

export default SseEvent;
