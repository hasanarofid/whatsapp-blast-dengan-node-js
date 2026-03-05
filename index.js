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

client.on('message_create', async (msg) => {
    const text = (msg.body || '').trim();
    if (!text.startsWith('/') && !text.startsWith('.')) return;

    console.log(`Command received: ${text} from ${msg.from}`);

    const parts = text.split(' ');
    const command = parts[0].toLowerCase().substring(1);
    const args = parts.slice(1).join(' ');

    const services = ['status', 'history', 'sf', 'digi', 'bc', 'tipe'];
    
    // Alias .cek to status
    let activeService = command === 'cek' ? 'status' : command;

    if (services.includes(activeService)) {
        if (!args) {
            msg.reply(`Silakan sertakan IMEI. Contoh: /${command} 123456789012345`);
            return;
        }

        msg.reply(`Sedang memproses permintaan ${activeService.toUpperCase()}...`);

        const result = await callCeirApi(activeService, args);

        if (result.status === 'success') {
            let responseMsg = `✅ *${result.service_code} SUCCESS*\n`;
            responseMsg += `Total IMEI: ${result.total_imei}\n`;
            
            if (activeService === 'history') {
                for (const [imei, history] of Object.entries(result.results)) {
                    responseMsg += `\n*IMEI: ${imei}*\n`;
                    if (Array.isArray(history)) {
                        history.forEach(item => {
                            responseMsg += `- [${item.date}] ${item.status}: ${item.note}\n`;
                        });
                    } else {
                        responseMsg += `- ${history}\n`;
                    }
                }
            } else if (activeService === 'tipe') {
                for (const [imei, detail] of Object.entries(result.results)) {
                    responseMsg += `\n*IMEI: ${imei}*\n`;
                    if (detail.ok) {
                        responseMsg += `- Brand: ${detail.brand}\n`;
                        responseMsg += `- Tipe: ${detail.tipe}\n`;
                    } else {
                        responseMsg += `- Tidak ditemukan\n`;
                    }
                }
            } else {
                for (const [imei, status] of Object.entries(result.results)) {
                    responseMsg += `- ${imei}: ${status}\n`;
                }
            }

            msg.reply(responseMsg);
        } else {
            msg.reply(`❌ *ERROR*: ${result.error_code || 'UNKNOWN_ERROR'}`);
        }
    } else if (command === 'help' || command === 'start') {
        const helpMsg = `📘 *CEIR API BOT HELP*\n\n` +
            `Gunakan perintah berikut:\n` +
            `• /status [imei] - Cek status IMEI\n` +
            `• /history [imei] - Cek riwayat IMEI\n` +
            `• /sf [imei] - Analisa SF\n` +
            `• /digi [imei] - Analisa Digi/Whitelist\n` +
            `• /bc [imei] - Bea Cukai / Check Auto\n` +
            `• /tipe [imei] - Cek merk & tipe device\n\n` +
            `*Catatan*: Anda bisa memasukkan hingga 50 IMEI sekaligus dipisahkan koma atau spasi.`;
        msg.reply(helpMsg);
    }
});

client.initialize();
