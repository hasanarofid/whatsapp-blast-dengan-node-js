const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { callCeirApi } = require('./ceir');
const { createQrisCharge, createPaymentLink, getTransactionStatus } = require('./midtrans');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    console.log('Please scan the QR code above with your WhatsApp.');
});

client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

const userState = {};
const pendingTransactions = new Map(); // orderId -> { from, amount, startTime }

// Database simulation (JSON file)
const DB_PATH = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ balances: {}, transactions: [] }, null, 2));
}

function getDb() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function updateBalance(userId, amount) {
    const db = getDb();
    db.balances[userId] = (db.balances[userId] || 0) + amount;
    db.transactions.push({
        userId,
        amount,
        type: 'topup',
        timestamp: new Date().toISOString()
    });
    saveDb(db);
    return db.balances[userId];
}

client.on('message_create', async (msg) => {
    const text = (msg.body || '').trim();
    if (text === '') return;

    const from = msg.from;
    const parts = text.split(/\s+/);
    let command = parts[0].toLowerCase();
    let args = parts.slice(1).join(' ');

    // Remove prefix if exists
    if (command.startsWith('/') || command.startsWith('.')) {
        command = command.substring(1);
    }

    // Map short aliases
    const commandMap = {
        's': 'status',
        'h': 'history',
        'sf': 'sf',
        'digi': 'digi',
        'bc': 'bc',
        't': 'tipe',
        'status': 'status',
        'history': 'history',
        'tipe': 'tipe'
    };

    const isImei = /^\d{15}$/.test(text);

    if (isImei) {
        userState[from] = text;
        console.log(`IMEI saved for ${from}: ${text}`);
        msg.reply('✅ IMEI telah disimpan. Silakan kirim perintah: *s, h, sf, digi, bc, t*');
        return;
    }

    // Topup command handler
    if (command === 'topup') {
        const amount = parseInt(args);
        if (isNaN(amount) || amount < 1000) {
            msg.reply('❌ Silakan masukkan nominal topup yang valid. Contoh: */topup 10000* (minimal Rp1.000)');
            return;
        }

        msg.reply(`⏳ Menyiapkan QRIS pembayaran sebesar *Rp ${amount.toLocaleString('id-ID')}*...`);

        try {
            const orderId = `TOPUP-${Date.now()}-${from.split('@')[0]}`;
            
            // Try to create direct QRIS charge first
            let qrisSuccess = false;
            try {
                const chargeResponse = await createQrisCharge(amount, orderId);
                if (chargeResponse.actions) {
                    const qrisAction = chargeResponse.actions.find(a => a.name === 'generate-qr-code');
                    if (qrisAction) {
                        const qrUrl = qrisAction.url;
                        const media = await MessageMedia.fromUrl(qrUrl);
                        
                        await client.sendMessage(from, media, { 
                            caption: `✅ *QRIS TERSEDIA*\n\n` +
                                     `Order ID: \`${orderId}\`\n` +
                                     `Nominal: *Rp ${amount.toLocaleString('id-ID')}*\n\n` +
                                     `Silakan scan QR di atas untuk melakukan pembayaran.\n` +
                                     `_Link ini otomatis expired dalam 15 menit._`
                        });

                        // Start monitoring this transaction
                        pendingTransactions.set(orderId, { from, amount, startTime: Date.now() });
                        monitorTransaction(orderId);
                        qrisSuccess = true;
                    }
                }
            } catch (qrisError) {
                console.warn(`Direct QRIS failed for ${orderId}, falling back to Payment Link. Reason: ${qrisError.message}`);
                // Proceed to fallback
            }

            if (qrisSuccess) return;

            // Fallback to Payment Link if direct QRIS is not available or failed
            const linkResponse = await createPaymentLink(amount, orderId);
            if (linkResponse.payment_url) {
                await client.sendMessage(from, 
                    `⚠️ *METODE QRIS LANGSUNG BELUM AKTIF*\n\n` +
                    `Akun Midtrans Anda belum mengaktifkan fitur QRIS masuk langsung ke WhatsApp. Sementara itu, silakan gunakan link pembayaran di bawah ini:\n\n` +
                    `Order ID: \`${orderId}\`\n` +
                    `Nominal: *Rp ${amount.toLocaleString('id-ID')}*\n\n` +
                    `Klik untuk Bayar:\n${linkResponse.payment_url}\n\n` +
                    `_Pilih menu QRIS di dalam link tersebut._`
                );
                pendingTransactions.set(orderId, { from, amount, startTime: Date.now() });
                monitorTransaction(orderId);
            } else {
                msg.reply('❌ Gagal membuat pembayaran. Silakan coba lagi nanti.');
            }
        } catch (error) {
            console.error('Topup Error:', error);
            const errorMsg = error.ApiResponse ? error.ApiResponse.status_message : error.message;
            msg.reply('❌ Terjadi kesalahan: ' + errorMsg);
        }
        return;
    }

    const activeService = commandMap[command];

    if (activeService) {
        // If no args but we have a saved IMEI, use it
        if (!args && userState[from]) {
            args = userState[from];
        }

        if (!args) {
            msg.reply(`Silakan sertakan IMEI atau kirim IMEI terlebih dahulu. Contoh: *s 123456789012345* atau kirim IMEI-nya saja.`);
            return;
        }

        console.log(`Processing ${activeService.toUpperCase()} for ${from} with IMEI: ${args}`);
        msg.reply(`🚀 1 IMEI *${activeService.toUpperCase()}* sedang dicek, mohon ditunggu bosku 🙏`);

        const result = await callCeirApi(activeService, args);

        if (result.status === 'success') {
            let responseMsg = '';
            
            for (const [imei, val] of Object.entries(result.results)) {
                if (activeService === 'history') {
                    responseMsg += `\n*IMEI: ${imei}*\n`;
                    if (Array.isArray(val)) {
                        val.forEach(item => {
                            responseMsg += `- [${item.date}] ${item.status}: ${item.note}\n`;
                        });
                    } else {
                        responseMsg += `- ${val}\n`;
                    }
                } else if (activeService === 'tipe') {
                    if (val.ok) {
                        responseMsg += `✅ *${val.brand} ${val.tipe}* (${imei})\n`;
                    } else {
                        responseMsg += `❌ *Tidak Ditemukan* (${imei})\n`;
                    }
                } else {
                    responseMsg += `${val} ${imei}\n`;
                }
            }

            responseMsg += `\n📅 Tanggal: *${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}*`;
            // Note: Balance is not available via API, so we skip it or use a placeholder
            // responseMsg += `\n💰 Sisa saldo: Cek di /api saldo`;

            msg.reply(responseMsg.trim());
        } else {
            msg.reply(`❌ *ERROR*: ${result.error_code || 'UNKNOWN_ERROR'}`);
        }
    } else if (command === 'help' || command === 'start') {
        const helpMsg = `📘 *CEIR API BOT HELP*\n\n` +
            `Gunakan perintah berikut:\n` +
            `• *s [imei]* - Cek status IMEI\n` +
            `• *h [imei]* - Cek riwayat IMEI\n` +
            `• *sf [imei]* - Analisa SF\n` +
            `• *digi [imei]* - Analisa Digi/Whitelist\n` +
            `• *bc [imei]* - Bea Cukai / Check Auto\n` +
            `• *t [imei]* - Cek merk & tipe device\n` +
            `• */topup [nominal]* - Topup saldo via QRIS\n\n` +
            `*Tips*: Anda bisa mengirim IMEI-nya saja terlebih dahulu, lalu kirim perintahnya (s, h, dll).`;
        msg.reply(helpMsg);
    } else if (command === 'saldo') {
        const db = getDb();
        const balance = db.balances[from] || 0;
        msg.reply(`💰 Saldo Anda: *Rp ${balance.toLocaleString('id-ID')}*`);
    } else if (command === 'report' && from === process.env.ADMIN_NUMBER) {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        const todayTrans = db.transactions.filter(t => t.timestamp.startsWith(today));
        const totalAmount = todayTrans.reduce((sum, t) => sum + t.amount, 0);
        
        let report = `📊 *LAPORAN TRANSAKSI HARIAN*\nTanggal: ${today}\n\n`;
        report += `Total Transaksi: ${todayTrans.length}\n`;
        report += `Total Nominal: *Rp ${totalAmount.toLocaleString('id-ID')}*\n\n`;
        report += `*Detail Reseller:*\n`;
        
        const resellerSummary = {};
        todayTrans.forEach(t => {
            resellerSummary[t.userId] = (resellerSummary[t.userId] || 0) + t.amount;
        });

        for (const [reseller, amount] of Object.entries(resellerSummary)) {
            report += `- ${reseller.split('@')[0]}: Rp ${amount.toLocaleString('id-ID')}\n`;
        }

        msg.reply(report);
    }
});

async function monitorTransaction(orderId) {
    const interval = setInterval(async () => {
        const trans = pendingTransactions.get(orderId);
        if (!trans) {
            clearInterval(interval);
            return;
        }

        // Timeout after 15 minutes
        if (Date.now() - trans.startTime > 15 * 60 * 1000) {
            pendingTransactions.delete(orderId);
            clearInterval(interval);
            return;
        }

        try {
            const status = await getTransactionStatus(orderId);
            if (status.transaction_status === 'settlement' || status.transaction_status === 'capture') {
                const newBalance = updateBalance(trans.from, trans.amount);
                
                // Notify user
                await client.sendMessage(trans.from, `✅ *TOPUP BERHASIL!*\n\nNominal: *Rp ${trans.amount.toLocaleString('id-ID')}*\nSaldo sekarang: *Rp ${newBalance.toLocaleString('id-ID')}*`);
                
                // Notify admin
                const adminNumber = process.env.ADMIN_NUMBER;
                if (adminNumber) {
                    await client.sendMessage(adminNumber, `🔔 *NOTIFIKASI TOPUP*\n\nReseller: ${trans.from.split('@')[0]}\nNominal: *Rp ${trans.amount.toLocaleString('id-ID')}*\nSaldo Reseller: *Rp ${newBalance.toLocaleString('id-ID')}*\nOrder ID: \`${orderId}\``);
                }

                pendingTransactions.delete(orderId);
                clearInterval(interval);
            } else if (status.transaction_status === 'expire' || status.transaction_status === 'cancel' || status.transaction_status === 'deny') {
                pendingTransactions.delete(orderId);
                clearInterval(interval);
            }
        } catch (error) {
            console.error(`Monitoring error for ${orderId}:`, error.message);
        }
    }, 30000); // Check every 30 seconds
}

client.initialize();
