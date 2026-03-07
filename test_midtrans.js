const { createQrisCharge } = require('./midtrans');

async function test() {
    console.log('Testing Midtrans QRIS Charge Creation...');
    console.log('Mode:', process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'PRODUCTION' : 'SANDBOX');
    console.log('Merchant ID:', process.env.MIDTRANS_MERCHANT_ID);
    console.log('Server Key (first 10):', process.env.MIDTRANS_SERVER_KEY ? process.env.MIDTRANS_SERVER_KEY.substring(0, 10) + '...' : 'NOT FOUND');
    
    try {
        const amount = 10000;
        const orderId = `TEST-${Date.now()}`;
        const response = await createQrisCharge(amount, orderId);
        
        console.log('Response Status Code:', response.status_code);
        console.log('Transaction Status:', response.transaction_status);
        console.log('Order ID:', response.order_id);
        
        if (response.actions) {
            const qrisAction = response.actions.find(a => a.name === 'generate-qr-code');
            if (qrisAction) {
                console.log('✅ QRIS URL Found:', qrisAction.url);
            } else {
                console.log('❌ QRIS URL NOT FOUND in actions');
            }
        } else {
            console.log('❌ No actions in response');
        }
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

test();
