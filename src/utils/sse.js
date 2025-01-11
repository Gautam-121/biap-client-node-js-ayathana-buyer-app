const SSE_CONNECTIONS = {};

/**
 * store sse connection object
 * @param {String} messageId 
 * @param {Object} sse 
 */
function addSSEConnection(messageId, sse) {
    console.log("Connect sse")
    SSE_CONNECTIONS[messageId] = sse;
}

function sendSSEResponse(messageId, action, response) {
    if (!SSE_CONNECTIONS?.[messageId]) {
        console.log(`[sendSSEResponse] No connection found for messageId: ${messageId}`);
        const timeoutStartTime = Date.now();
        
        setTimeout(() => {
            if (SSE_CONNECTIONS?.[messageId]) {
                console.log(`[sendSSEResponse] Sending response after timeout for messageId: ${messageId}`);
                SSE_CONNECTIONS?.[messageId]?.send(response, action, messageId);
                const timeoutDuration = Date.now() - timeoutStartTime;
                console.log(`[sendSSEResponse] Timeout duration: ${timeoutDuration}ms`);
            } else {
                console.log(`[sendSSEResponse] No connection found even after timeout for messageId: ${messageId}`);
            }
        }, process.env.SSE_TIMEOUT);
    } else {
        console.log(`[sendSSEResponse] Sending response immediately for messageId: ${messageId}`);
        SSE_CONNECTIONS?.[messageId]?.send(response, action, messageId);
    }
}

export {
    addSSEConnection,
    sendSSEResponse,
    SSE_CONNECTIONS
};