# WhatsApp Blast with CEIR API Integration

Bot WhatsApp sederhana menggunakan Node.js untuk melakukan pengecekan status IMEI melalui CEIR API.

## Fitur

- Pengecekan status IMEI (tunggal atau banyak sekaligus).
- Pengecekan riwayat (history) IMEI.
- Pengecekan merk dan tipe device.
- Mendukung berbagai layanan CEIR: `status`, `history`, `sf`, `digi`, `bc`, `tipe`.
- Berbasis `whatsapp-web.js`.

## Persiapan

1.  Clone repository ini.
2.  Install dependensi:
    ```bash
    npm install
    ```
3.  Buat file `.env` di direktori utama dan isi dengan kredensial API Anda:
    ```env
    CEIR_BASE_URL=https://api.warungkode.my.id
    CEIR_API_KEY=your_api_key
    CEIR_API_SECRET=your_api_secret
    ```

## Cara Menjalankan

1.  Jalankan aplikasi:
    ```bash
    npm start
    ```
2.  Scan QR code yang muncul di terminal menggunakan aplikasi WhatsApp Anda (Linked Devices).

## Perintah Tersedia

Kirim pesan berikut ke nomor WhatsApp bot:

- `.cek [imei]` - Cek status IMEI.
- `/status [imei]` - Alias untuk cek status.
- `/history [imei]` - Cek riwayat IMEI.
- `/tipe [imei]` - Cek merk dan tipe device.
- `/help` - Menampilkan bantuan.

_Catatan: Anda bisa memasukkan hingga 50 IMEI sekaligus dengan memisahkan menggunakan koma, spasi, atau baris baru._

## Lisensi

ISC
