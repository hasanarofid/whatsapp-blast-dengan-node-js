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

## Cara Reset Sesi (Ganti Nomor WhatsApp)

Jika Anda ingin mengganti nomor WhatsApp yang terhubung:

1.  Hentikan program (Ctrl + C).
2.  Hapus folder `.wwebjs_auth`:
    ```bash
    rm -rf .wwebjs_auth
    ```
3.  Jalankan kembali `npm start` dan scan QR dengan nomor baru.

## Perintah Tersedia

Bot ini mendukung dua cara pengecekan:

### 1. Cara Langsung (Satu Pesan)

Kirim perintah diikuti IMEI:

- `s [imei]` - Cek status IMEI.
- `h [imei]` - Cek riwayat IMEI.
- `t [imei]` - Cek merk dan tipe device.
- `sf [imei]`, `digi [imei]`, `bc [imei]` - Layanan lainnya.

### 2. Cara Bertahap (Seperti AirBot)

1.  Kirim IMEI-nya saja (15 digit).
2.  Bot akan membalas "IMEI telah disimpan".
3.  Kirim perintahnya saja (`s`, `h`, `sf`, `digi`, `bc`, atau `t`).

_Tips: Gunakan `/help` untuk melihat bantuan lengkap._

## Lisensi

ISC
