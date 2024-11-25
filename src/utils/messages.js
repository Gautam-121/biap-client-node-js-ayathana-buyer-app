import moment from 'moment';

const MESSAGES = {
    NOTIFICAION_NOT_FOUND: 'Notification does not exist',
    ORDER_NOT_EXIST:'Order not exist',
    PAYMENT_FAILED :'Refund Payment Failed',
    LOGIN_ERROR_NO_TOKEN: 'Authentication token is missing',
    LOGIN_ERROR_TOKEN_EXPIRED: 'Authentication token has expired',
    LOGIN_ERROR_INVALID_TOKEN: 'Invalid authentication token',
    LOGIN_ERROR_TOKEN_NOT_ACTIVE: 'Token not yet active',
    LOGIN_ERROR_TOKEN_GENERIC: 'Authentication failed',
    LOGIN_ERROR_EMAIL_NOT_VERIFIED: 'Email not verified'
};

function formatMessage(username, text) {
    return {
        username,
        text,
        time: moment().format('h:mm a')
    };
}

export default {MESSAGES, formatMessage};