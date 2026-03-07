const midtransClient = require('midtrans-client');
require('dotenv').config();

const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

console.log('Testing Midtrans Keys...');
console.log('Mode:', isProd ? 'PRODUCTION' : 'SANDBOX');
console.log('Server Key Length:', serverKey ? serverKey.length : 0);

const snap = new midtransClient.Snap({
    isProduction: isProd,
    serverKey: serverKey,
    clientKey: clientKey
});

const parameter = {
    "transaction_details": {
        "order_id": "TEST-" + Date.now(),
        "gross_amount": 10000
    }
};

console.log('\n--- Test 1: SNAP (Payment Link) ---');
snap.createTransaction(parameter)
    .then((transaction) => {
        console.log('✅ SNAP SUCCESS! Redirect URL:', transaction.redirect_url);
    })
    .catch((e) => {
        console.error('❌ SNAP FAILED!', e.message);
    })
    .finally(() => {
        console.log('\n--- Test 2: Core API (Direct QRIS Image) ---');
        const qrisParam = {
            "payment_type": "qris",
            "transaction_details": {
                "order_id": "TEST-QRIS-" + Date.now(),
                "gross_amount": 10000
            }
        };

        const coreApi = new midtransClient.CoreApi({
            isProduction: isProd,
            serverKey: serverKey,
            clientKey: clientKey
        });

        coreApi.charge(qrisParam)
            .then((result) => {
                console.log('✅ CORE API SUCCESS! QRIS Image URL Found.');
                process.exit(0);
            })
            .catch((e) => {
                console.error('❌ CORE API FAILED!');
                console.error('Pesan Error:', e.message);
                console.log('\nKesimpulan: Fitur "Core API QRIS" belum diaktifkan oleh Midtrans.');
                process.exit(0);
            });
    });
