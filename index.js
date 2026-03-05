const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { callCeirApi } = require('./ceir');

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
            `• *t [imei]* - Cek merk & tipe device\n\n` +
            `*Tips*: Anda bisa mengirim IMEI-nya saja terlebih dahulu, lalu kirim perintahnya (s, h, dll).`;
        msg.reply(helpMsg);
    }
});

client.initialize();
