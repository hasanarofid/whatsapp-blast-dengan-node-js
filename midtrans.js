const midtransClient = require('midtrans-client');
const axios = require('axios');
// Note: dotenv is injected via runner

// Create Core API instance
const coreApi = new midtransClient.CoreApi({
    isProduction: (process.env.MIDTRANS_IS_PRODUCTION || '').trim() === 'true',
    serverKey: (process.env.MIDTRANS_SERVER_KEY || '').trim(),
    clientKey: (process.env.MIDTRANS_CLIENT_KEY || '').trim()
});

// Create Snap API instance
const snap = new midtransClient.Snap({
    isProduction: (process.env.MIDTRANS_IS_PRODUCTION || '').trim() === 'true',
    serverKey: (process.env.MIDTRANS_SERVER_KEY || '').trim(),
    clientKey: (process.env.MIDTRANS_CLIENT_KEY || '').trim()
});

// Debug logs
const isProd = (process.env.MIDTRANS_IS_PRODUCTION || '').trim() === 'true';
const mId = (process.env.MIDTRANS_MERCHANT_ID || '').trim();
const sKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();

console.log('--- Midtrans Configuration ---');
console.log('Mode:', isProd ? 'PRODUCTION' : 'SANDBOX');
console.log('Merchant ID:', mId);
console.log('Server Key Length:', sKey.length);
console.log('------------------------------');

/**
 * Create QRIS Charge (Core API)
 * @param {number} amount 
 * @param {string} orderId 
 */
async function createQrisCharge(amount, orderId) {
    try {
        const parameter = {
            "payment_type": "qris",
            "transaction_details": {
                "gross_amount": amount,
                "order_id": orderId,
            }
        };

        const response = await coreApi.charge(parameter);
        return response;
    } catch (error) {
        console.error('Midtrans QRIS Charge Error:', error.message);
        throw error;
    }
}

/**
 * Create Payment Link / Snap Transaction (Production Ready)
 * @param {number} amount 
 * @param {string} orderId 
 */
async function createPaymentLink(amount, orderId) {
    try {
        const parameter = {
            "transaction_details": {
                "order_id": orderId,
                "gross_amount": amount
            },
            "enabled_payments": ["qris"]
        };

        const response = await snap.createTransaction(parameter);
        
        return {
            payment_url: response.redirect_url,
            ...response
        };
    } catch (error) {
        console.error('Midtrans API Error:', error.message);
        if (error.ApiResponse) {
            console.error('API Response Details:', JSON.stringify(error.ApiResponse, null, 2));
        }
        throw error;
    }
}

/**
 * Get Transaction Status
 * @param {string} orderId - Order ID to check
 */
async function getTransactionStatus(orderId) {
    try {
        const response = await coreApi.transaction.status(orderId);
        return response;
    } catch (error) {
        return null; // Silent for polling
    }
}

module.exports = { createQrisCharge, createPaymentLink, getTransactionStatus };
