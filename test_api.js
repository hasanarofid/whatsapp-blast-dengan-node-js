const { callCeirApi } = require('./ceir');

async function test() {
    console.log('Testing STATUS service...');
    const statusRes = await callCeirApi('status', '356939104967430');
    console.log('STATUS Result:', JSON.stringify(statusRes, null, 2));

    console.log('\nTesting TIPE service...');
    const tipeRes = await callCeirApi('tipe', '356875111472861');
    console.log('TIPE Result:', JSON.stringify(tipeRes, null, 2));
}

test();
