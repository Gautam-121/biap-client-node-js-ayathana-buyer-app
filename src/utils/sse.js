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

function checkSSEConnection(messageId){
    return SSE_CONNECTIONS[messageId]
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
        },30000); // process.env.SSE_TIMEOUT
    } else {
        console.log(`[sendSSEResponse] Sending response immediately for messageId: ${messageId}`);
        SSE_CONNECTIONS?.[messageId]?.send(response, action, messageId);
    }
}

export {
    addSSEConnection,
    sendSSEResponse,
    SSE_CONNECTIONS,
    checkSSEConnection
};

// const SSE_CONNECTIONS = {};
// const RESPONSE_QUEUES = {};
// const SSE_TIMEOUT = parseInt(process.env.SSE_TIMEOUT || 60000, 10); // Default to 60 seconds

// /**
//  * Store SSE connection object
//  * @param {String} messageId 
//  * @param {Object} sse 
//  */
// function addSSEConnection(messageId, sse) {
//     if (SSE_CONNECTIONS[messageId]) {
//         console.warn(`[addSSEConnection] Connection already exists for messageId: ${messageId}`);
//         return;
//     }
//     console.log("Connect sse");
//     SSE_CONNECTIONS[messageId] = sse;

//     // Send any queued responses for this messageId
//     if (RESPONSE_QUEUES[messageId]) {
//         console.log(`[addSSEConnection] Sending queued responses for messageId: ${messageId}`);
//         RESPONSE_QUEUES[messageId].forEach(({ action, response }) => {
//             try {
//                 sse.send(response, action, messageId);
//             } catch (err) {
//                 console.error(`[addSSEConnection] Error sending queued response for messageId: ${messageId}`, err);
//             }
//         });
//         delete RESPONSE_QUEUES[messageId]; // Clear the queue after sending
//     }
// }

// /**
//  * Check if an SSE connection exists for a messageId
//  * @param {String} messageId 
//  * @returns {Boolean}
//  */
// function checkSSEConnection(messageId) {
//     return !!SSE_CONNECTIONS[messageId];
// }

// /**
//  * Send SSE response
//  * @param {String} messageId 
//  * @param {String} action 
//  * @param {Object} response 
//  */
// function sendSSEResponse(messageId, action, response) {
//     if (!SSE_CONNECTIONS?.[messageId]) {
//         console.log(`[sendSSEResponse] No connection found for messageId: ${messageId}. Queueing response.`);
//         if (!RESPONSE_QUEUES[messageId]) {
//             RESPONSE_QUEUES[messageId] = [];
//         }
//         RESPONSE_QUEUES[messageId].push({ action, response });

//         setTimeout(() => {
//             if (SSE_CONNECTIONS?.[messageId]) {
//                 console.log(`[sendSSEResponse] Sending response after timeout for messageId: ${messageId}`);
//                 try {
//                     SSE_CONNECTIONS[messageId].send(response, action, messageId);
//                 } catch (err) {
//                     console.error(`[sendSSEResponse] Error sending response for messageId: ${messageId}`, err);
//                     delete SSE_CONNECTIONS[messageId]; // Remove the connection if it's invalid
//                 }
//             } else {
//                 console.log(`[sendSSEResponse] No connection found even after timeout for messageId: ${messageId}`);
//             }
//         }, SSE_TIMEOUT);
//     } else {
//         console.log(`[sendSSEResponse] Sending response immediately for messageId: ${messageId}`);
//         try {
//             SSE_CONNECTIONS[messageId].send(response, action, messageId);

//             // Send any queued responses
//             if (RESPONSE_QUEUES[messageId]) {
//                 console.log(`[sendSSEResponse] Sending queued responses for messageId: ${messageId}`);
//                 RESPONSE_QUEUES[messageId].forEach(({ action, response }) => {
//                     SSE_CONNECTIONS[messageId].send(response, action, messageId);
//                 });
//                 delete RESPONSE_QUEUES[messageId]; // Clear the queue after sending
//             }
//         } catch (err) {
//             console.error(`[sendSSEResponse] Error sending response for messageId: ${messageId}`, err);
//             delete SSE_CONNECTIONS[messageId]; // Remove the connection if it's invalid
//         }
//     }
// }

// export {
//     addSSEConnection,
//     sendSSEResponse,
//     SSE_CONNECTIONS,
//     checkSSEConnection
// };