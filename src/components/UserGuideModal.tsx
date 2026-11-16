import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Settings as SettingsIcon,
  Users,
  Receipt,
  Send,
  BarChart3,
  Database,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Smartphone,
  Lock,
} from 'lucide-react';
import { AppRole } from '../types/cashback';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  appRole?: AppRole;
}

interface GuideSection {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  summary: string;
  steps: {
    title: string;
    description: string;
    details?: string[];
    tips?: string;
    warning?: string;
  }[];
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  appRole = 'admin',
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>('flow');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const sections: GuideSection[] = useMemo(
    () => [
      {
        id: 'flow',
        title: 'Ikhtisar & Alur Kerja Utama Sistem',
        shortTitle: 'Alur Sistem',
        icon: Sparkles,
        tag: 'Konsep Dasar',
        summary:
          'Memahami alur kerja lengkap CashbackPro mulai dari pencatatan faktur, sinkronisasi konsumen real, pencairan tunai oleh petugas, hingga tanda terima resmi 2 rangkap.',
        steps: [
          {
            title: '1. Siklus Hidup Cashback Konsumen',
            description:
              'Aplikasi CashbackPro mengelola program promosi cashback secara terstruktur dari hulu ke hilir melalui 4 tahap utama:',
            details: [
              'Pencatatan Belanja: Admin menginput faktur penjualan secara manual atau mengimpor puluhan nota sekaligus lewat file Excel (.xlsx).',
              'Kalkulasi & Hak Paket Otomatis: Sistem menghitung nominal cashback secara otomatis sesuai skema aktif (% Flat atau Tiered) beserta penentuan paket hak (Cashback + Parsel, Cashback Saja, atau Parcel Saja).',
              'Sinkronisasi Master Konsumen Real: Identitas konsumen dari transaksi faktur otomatis terdata, tersinkronisasi, dan bebas duplikasi di Master Konsumen.',
              'Pencairan Tunai (Cash) & Dokumentasi: Petugas menyerahkan uang tunai langsung, melampirkan foto serah terima, tanda tangan digital konsumen, serta mencetak Tanda Terima Resmi 2 rangkap.',
            ],
            tips: 'Seluruh data otomatis tersinkronisasi ke Cloud secara real-time di berbagai perangkat (PC, laptop, tablet, maupun HP) tanpa perlu login akun email.',
          },
          {
            title: '2. Pemisahan Hak Akses & Fitur Utama',
            description:
              'Sistem dilengkapi pengamanan peran untuk menjaga kerapian data operasional harian:',
            details: [
              'Mode Admin & Mode Petugas: Admin memiliki kendali penuh atas seluruh data & pengaturan, sedangkan Petugas fokus pada transaksi pencairan cashback serta dapat melihat halaman lain dalam mode lihat saja (Read-Only).',
              'Dashboard & 10 Besar Tertinggi: Pantau omset, progres pencairan, grafik tren bulanan, serta peringkat 10 konsumen dengan belanja dan cashback tertinggi.',
              'Filter Tanggal Universal: Saring seluruh angka dashboard, faktur, rekap konsumen, dan leaderboard berdasarkan rentang tanggal tertentu.',
              'Kop Surat & Logo Perusahaan: Unggah logo usaha dan identitas perusahaan untuk ditampilkan pada aplikasi, struk, dan Tanda Terima Resmi.',
              'Backup & Keamanan Cloud: Cadangkan seluruh database ke file .JSON dan pulihkan kapan saja.',
            ],
          },
        ],
      },
      {
        id: 'roles',
        title: 'Mode Admin, Mode Petugas & Persetujuan Pembatalan',
        shortTitle: 'Mode Admin & Petugas',
        icon: Lock,
        tag: 'Hak Akses & Keamanan',
        summary:
          'Memahami perbedaan akses antara Mode Petugas dan Mode Admin, cara beralih mode dengan PIN, serta alur ACC Admin untuk pembatalan pencairan.',
        steps: [
          {
            title: 'A. Hak Akses pada Mode Petugas',
            description:
              'Saat aplikasi dibuka pada mode operasional kasir/lapangan, sistem berada pada Mode Petugas yang aman dari perubahan data tidak disengaja:',
            details: [
              'Transaksi Penuh di Penerimaan Cashback: Petugas dapat memproses pencairan tunai (Cairkan), membuka Tanda Terima Resmi, dan mengajukan pembatalan pencairan.',
              'Mode Lihat Saja (Read-Only) di Halaman Lain: Petugas dapat membuka Dashboard, 10 Besar Tertinggi, Rekap Faktur, Rekap Konsumen, dan Master Konsumen untuk melihat data, mencari, memfilter, mencetak struk/tanda terima, dan mengirim WhatsApp — tanpa bisa menambah, mengedit, atau menghapus data.',
              'Menu Pengaturan Terkunci: Halaman Pengaturan disembunyikan dan diblokir khusus untuk Mode Admin.',
            ],
          },
          {
            title: 'B. Masuk ke Mode Admin & Mengunci Kembali',
            description:
              'Admin dapat membuka akses penuh kapan saja pada perangkat yang digunakan:',
            details: [
              'Klik tombol "Mode Admin" / "Masuk Mode Admin" pada bilah navigasi (sidebar/header/bawah) atau footer aplikasi.',
              'Masukkan PIN Admin rahasia untuk membuka seluruh akses edit data, import/export Excel, sinkronisasi master, dan Pengaturan.',
              'Setelah selesai mengatur data, klik badge "Mode Admin (Aktif)" atau tombol kunci untuk kembali ke Mode Petugas agar perangkat aman digunakan kasir/petugas.',
            ],
          },
          {
            title: 'C. Mengatur PIN Admin Rahasia (Khusus Admin)',
            description:
              'Admin dapat menetapkan atau mengubah PIN Admin kustom yang berlaku lintas perangkat:',
            details: [
              'Masuk ke Mode Admin lalu buka menu Pengaturan -> tab "Cloud & Database".',
              'Gulir ke bagian paling bawah dan klik panel tersembunyi "Keamanan Akses Lanjutan" (Atur PIN).',
              'Masukkan PIN Admin baru (minimal 4 digit angka), ulangi pada kolom konfirmasi, lalu klik "Simpan Pengaturan & Profil".',
            ],
            warning:
              'Jaga kerahasiaan PIN Admin Anda. Jangan membagikan PIN Admin kepada pihak yang tidak berwenang agar kontrol data dan ACC pembatalan tetap terjaga.',
          },
          {
            title: 'D. Alur Pembatalan Pencairan (Ajukan Batal -> ACC Admin)',
            description:
              'Untuk mencegah penyalahgunaan, petugas tidak dapat langsung membatalkan cashback yang sudah dicairkan tanpa persetujuan Admin:',
            details: [
              '1. Petugas Mengajukan Pembatalan: Di menu Penerimaan Cashback, petugas klik tombol "Ajukan Batal" pada konsumen terkait, lalu mengisi nama petugas pengaju dan alasan pembatalan.',
              '2. Admin Memberikan ACC: Admin akan melihat notifikasi lonceng angka kuning pada bilah navigasi atau tombol di Penerimaan Cashback. Admin membuka daftar pengajuan lalu klik "ACC Pembatalan" (atau "Tolak").',
              '3. Eksekusi Pembatalan: Setelah status berubah menjadi di-ACC Admin, tombol "Batalkan (ACC)" aktif di layar Petugas untuk mengembalikan status faktur konsumen menjadi belum cair.',
            ],
            tips: 'Jika berada langsung di Mode Admin, Admin juga memiliki opsi pembatalan langsung maupun melihat riwayat keputusan ACC.',
          },
        ],
      },
      {
        id: 'step1',
        title: 'Langkah 1: Pengaturan Kebijakan, Profil & Logo Perusahaan',
        shortTitle: '1. Pengaturan & Logo',
        icon: SettingsIcon,
        tag: 'Konfigurasi Admin',
        summary:
          'Mengatur persentase cashback, profil perusahaan, upload logo usaha, tata letak navigasi, hingga keamanan akses di menu Pengaturan (khusus Mode Admin).',
        steps: [
          {
            title: 'A. Skema & Aturan Perhitungan Cashback (Tab Aturan Cashback)',
            description:
              'Buka menu Pengaturan -> tab "Aturan Cashback" untuk menyesuaikan rumus promosi toko:',
            details: [
              'Mode Flat (Persentase Tetap): Seluruh transaksi mendapatkan persentase cashback tetap (misalnya 2% Flat) tanpa batas minimal belanja.',
              'Mode Tiered (Bertingkat): Persentase cashback menyesuaikan rentang nominal belanja.',
              'Batas Maksimal Reward & Pembulatan: Atur batas maksimum cashback per transaksi (opsional) serta metode pembulatan rupiah (Tepat/Eksak, Ratusan Terdekat, atau Ribuan Terdekat).',
              'Masa Berlaku Klaim & Target Belanja Parcel: Tentukan batas hari klaim dan nominal akumulasi belanja untuk kelayakan paket Parcel.',
              'Simulasi Hitungan Langsung: Uji coba angka belanja di panel simulator hitam bagian bawah sebelum menyimpan.',
            ],
            tips: 'Setiap perubahan persentase atau aturan cashback akan otomatis menghitung ulang nilai cashback seluruh faktur yang ada.',
          },
          {
            title: 'B. Upload Logo & Identitas Perusahaan (Tab Profil Perusahaan)',
            description:
              'Lengkapi profil usaha Anda agar seluruh dokumen tampil resmi dan profesional:',
            details: [
              'Upload Logo Perusahaan: Klik "Upload Logo" untuk mengunggah gambar logo berformat PNG, JPG, WebP, atau SVG. Logo otomatis dioptimalkan dan tampil di sidebar, header mobile/desktop, Struk Digital, dan kop surat Tanda Terima Resmi.',
              'Identitas & Kontak Usaha: Isi Nama Resmi Perusahaan/Toko, Tagline, Alamat Lengkap, Kota, Nomor Telepon/WA Bisnis, Email, Website, dan NPWP/NIB.',
              'Pejabat Penanggung Jawab & Rekening: Isi Nama Pimpinan/Kasir, Jabatan, info rekening operasional, serta Catatan Kaki Kwitansi.',
            ],
          },
          {
            title: 'C. Memilih Gaya Tata Letak Navigasi',
            description:
              'Di tab "Aturan Cashback", Anda dapat memilih posisi menu navigasi aplikasi sesuai kenyamanan perangkat:',
            details: [
              'Di Samping (Sidebar): Menu vertikal elegan di sisi kiri pada PC/laptop dan laci samping (drawer) + bilah menu cepat 5 tombol di bagian bawah pada mode HP.',
              'Di Atas (Top Bar): Navigasi horizontal ringkas di bagian atas layar.',
              'Di Bawah (Thumb Dock): Bilah navigasi melayang di bawah layar.',
            ],
          },
        ],
      },
      {
        id: 'step2',
        title: 'Langkah 2: Mengelola Master Data Konsumen (Data Real)',
        shortTitle: '2. Master Konsumen',
        icon: Users,
        tag: 'Database Pelanggan',
        summary:
          'Pusat data pelanggan terpadu yang otomatis tersinkronisasi dengan faktur transaksi real, lengkap dengan kode pelanggan, kontak WhatsApp, dan riwayat belanja.',
        steps: [
          {
            title: 'A. Sinkronisasi Otomatis & Data Real',
            description:
              'Master Konsumen selalu dijaga agar akurat mencerminkan transaksi nyata di lapangan:',
            details: [
              'Pendaftaran & Rekonsiliasi Otomatis: Konsumen baru pada faktur otomatis terdaftar dengan kode pelanggan berurutan (misal KSM-001) dan data ganda otomatis digabungkan.',
              'Tombol Sinkron Data Real (Mode Admin): Jika terdeteksi selisih atau nama baru dari faktur yang belum masuk master, Admin dapat menekan tombol "Sinkron Data Real" untuk menyelaraskan master secara instan.',
            ],
          },
          {
            title: 'B. Menambah, Mengedit, & Mengatur Status Konsumen (Admin)',
            description:
              'Admin dapat mengelola data pelanggan di tab "Master Konsumen":',
            details: [
              'Tambah / Edit Konsumen: Klik "+ Tambah Konsumen Baru" atau tombol "Edit" untuk memperbarui Nama, No WhatsApp, Email, Kota, Alamat, dan Catatan (metode pencairan otomatis Tunai/Cash).',
              'Status Aktif / Non-Aktif: Klik badge status konsumen untuk mengaktifkan atau menonaktifkan status keanggotaan.',
              'Import & Export Master Excel: Gunakan "Import Excel" (dengan unduhan template .xlsx resmi) untuk memasukkan data pelanggan massal, atau "Export Master" untuk mengunduh rekap master.',
            ],
          },
          {
            title: 'C. Pencarian, Filter & Aksi Lihat (Admin & Petugas)',
            description:
              'Baik Admin maupun Petugas dapat menelusuri Master Konsumen dengan cepat:',
            details: [
              'Saring data berdasarkan Status (Aktif/Non-Aktif), Status Transaksi (Ada Transaksi / Belum Ada), Kota, dan urutan pengurutan.',
              'Klik tombol "Faktur (N)" pada kartu/baris konsumen untuk langsung melompat ke daftar faktur milik konsumen tersebut.',
              'Klik ikon/tombol WhatsApp untuk langsung membuka chat WhatsApp ke nomor pelanggan (nomor 08 otomatis dikonversi ke format 62).',
            ],
          },
        ],
      },
      {
        id: 'step3',
        title: 'Langkah 3: Input, Import & Rekap Faktur Belanja',
        shortTitle: '3. Rekap Faktur',
        icon: Receipt,
        tag: 'Pencatatan Transaksi',
        summary:
          'Mencatat faktur belanja baru, mengimpor data transaksi dari Excel, mengatur paket benefit per faktur, hingga mencetak struk digital.',
        steps: [
          {
            title: 'A. Menginput Faktur Baru Manual (Mode Admin)',
            description: 'Klik "+ Input Faktur Baru" pada halaman Rekap Faktur:',
            details: [
              'Nomor & Tanggal Faktur: Nomor unik dibuat otomatis (tetap dapat disesuaikan dengan nomor nota fisik) beserta tanggal transaksi.',
              'Pilih atau Tambah Konsumen: Cari konsumen dari Master Konsumen atau ketik konsumen baru untuk langsung didaftarkan.',
              'Rincian & Total Belanja (Rp): Isi deskripsi barang dan nominal belanja; persentase serta rupiah cashback langsung terhitung otomatis.',
              'Paket Hak & Metode Pencairan: Pilih paket hak konsumen (Cashback + Parsel, Cashback Saja, atau Parcel Saja) dengan pencairan Tunai (Cash).',
            ],
          },
          {
            title: 'B. Import Faktur Massal dari Excel & Reset Faktur (Mode Admin)',
            description:
              'Mempercepat input puluhan hingga ratusan transaksi dalam hitungan detik:',
            details: [
              'Klik "Import Excel" di Rekap Faktur atau Footer -> klik "Unduh Template Excel" -> isi kolom sesuai panduan -> upload kembali untuk pratinjau validasi sebelum disimpan.',
              'Pengaturan Paket Hak Massal: Admin dapat mengubah paket hak (Cashback + Parsel / Cashback / Parcel) satuan langsung di tabel maupun massal untuk beberapa faktur sekaligus.',
              'Reset Faktur: Tersedia tombol khusus Admin untuk mengosongkan daftar faktur bila ingin memulai periode pembukuan baru.',
            ],
          },
          {
            title: 'C. Filter Tanggal Global, Pencarian & Struk Digital (Admin & Petugas)',
            description:
              'Meninjau riwayat faktur secara cepat di PC maupun HP:',
            details: [
              'Filter Rentang Tanggal Global: Gunakan pemilih tanggal di bagian atas layar untuk membatasi tampilan ke periode tertentu (misal awal hingga akhir tahun).',
              'Filter Status & Urutan: Saring faktur berdasarkan Menunggu (Pending), Siap Cair (Ready), atau Sudah Cair (Disbursed).',
              'Cetak Struk Digital: Klik tombol "Struk" pada faktur mana pun untuk melihat bukti faktur digital, mencetak/PDF, atau mengirim rincian ke WhatsApp konsumen.',
            ],
          },
        ],
      },
      {
        id: 'step4',
        title: 'Langkah 4: Pencairan Tunai, Nama Petugas & Tanda Terima',
        shortTitle: '4. Pencairan Cashback',
        icon: Send,
        tag: 'Transaksi & Serah Terima',
        summary:
          'Panduan utama petugas dan admin dalam menyerahkan uang tunai cashback per konsumen, mengambil bukti foto, tanda tangan digital, hingga mencetak Tanda Terima Resmi.',
        steps: [
          {
            title: 'A. Memproses Pencairan di Halaman Penerimaan Cashback',
            description:
              'Buka menu "Penerimaan Cashback" untuk melihat daftar konsumen yang memiliki saldo cashback siap cair maupun yang sudah dicairkan:',
            details: [
              'Gunakan tab filter "Belum Cair", "Sudah Cair", atau "Semua", serta kotak pencarian (bisa mencari berdasarkan nama konsumen, kode, no HP, nama penerima, maupun nama petugas).',
              'Klik tombol hijau "Cairkan" pada konsumen yang akan menerima dana tunai untuk membuka formulir "Proses Pencairan Cashback Konsumen".',
              'Seluruh faktur konsumen yang belum cair otomatis dirangkum menjadi satu total pencairan tunai.',
            ],
          },
          {
            title: 'B. Nama Petugas Penyerah Cashback (Otomatis Per Perangkat)',
            description:
              'Setiap transaksi pencairan mencatat siapa petugas yang menyerahkan dana tunai kepada konsumen:',
            details: [
              'Isi kolom "Petugas Penyerah Cashback" (misalnya: Maman pada perangkat 1, atau Agus pada perangkat 2).',
              'Otomatis Tersimpan Per Perangkat: Setelah diisi sekali pada suatu perangkat, nama petugas tersebut otomatis terisi pada setiap input pencairan berikutnya di perangkat yang sama.',
              'Ganti Petugas Kapan Saja: Jika petugas berganti shift di perangkat yang sama, cukup klik tanda silang (×) pada kolom petugas lalu ketik nama petugas yang baru.',
            ],
          },
          {
            title: 'C. Foto Bukti & Tanda Tangan Elektronik Layar Penuh',
            description:
              'Lengkapi bukti otentik serah terima uang tunai secara langsung di tempat:',
            details: [
              'Foto Bukti Serah Terima Tunai: Pilih "Ambil Foto Langsung" dari kamera perangkat atau "Upload Foto" dari galeri. Gambar otomatis dikompres agar hemat kuota penyimpanan.',
              'Tanda Tangan Elektronik Penerima: Konsumen dapat langsung menandatangani kotak kanvas memakai jari/stylus. Klik "Perbesar (Layar Penuh)" untuk area tanda tangan yang lega di HP atau tablet.',
              'Auto-Simpan Draf Sementara: Jika jendela tertutup tidak sengaja saat mengisi, draf isian dan tanda tangan sementara tetap terjaga sebelum tombol konfirmasi pencairan ditekan.',
            ],
          },
          {
            title: 'D. Cetak Tanda Terima Resmi (2 Rangkap) & Kirim WhatsApp',
            description:
              'Setelah pencairan selesai, cetak Berita Acara resmi untuk arsip dan konsumen:',
            details: [
              'Klik tombol "Tanda Terima Resmi" pada baris konsumen di Penerimaan Cashback atau Rekap Konsumen.',
              'Dokumen tampil lengkap dengan logo & kop surat perusahaan, rincian faktur, nama penerima, nama petugas penyerah, foto bukti, dan tanda tangan digital.',
              'Saat dicetak atau disimpan ke PDF, sistem otomatis menyiapkan tepat 2 rangkap: Rangkap 1 (Asli untuk Konsumen) dan Rangkap 2 (Arsip untuk Perusahaan).',
              'Anda juga dapat mengirim ringkasan tanda terima langsung ke chat WhatsApp konsumen dengan 1 klik.',
            ],
          },
        ],
      },
      {
        id: 'step5',
        title: 'Langkah 5: Dashboard, 10 Besar, Rekap Konsumen & Export Excel',
        shortTitle: '5. Analitik & Laporan',
        icon: BarChart3,
        tag: 'Monitoring & Export',
        summary:
          'Memantau performa omset toko, peringkat loyalitas 10 Besar Tertinggi, manajemen paket hak di Rekap Konsumen, serta unduh laporan Excel.',
        steps: [
          {
            title: 'A. Menu Dashboard',
            description:
              'Menampilkan ringkasan performa keuangan program cashback secara real-time:',
            details: [
              'Ringkasan KPI: Total Omset Belanja, Total Cashback Terhitung, Rasio Efektif, serta rincian nominal Sudah Dicairkan, Siap Cair, dan Pending.',
              'Distribusi Paket Hak Konsumen: Jumlah penerima paket Cashback + Parsel, Cashback Saja, dan Parcel Saja.',
              'Grafik Pergerakan & Tren Bulanan: Visualisasi perkembangan belanja dan cashback dari bulan ke bulan.',
            ],
          },
          {
            title: 'B. Menu 10 Besar Tertinggi (Leaderboard Loyalitas)',
            description:
              'Mengapresiasi konsumen paling loyal berdasarkan akumulasi belanja & cashback:',
            details: [
              'Tersedia tampilan Podium 3 Besar dan tabel peringkat lengkap beserta indikator pencapaian target Parcel.',
              'Gunakan filter periode (Semua Waktu, Bulan Ini, Bulan Lalu) serta tombol WhatsApp untuk menyapa konsumen unggulan.',
            ],
          },
          {
            title: 'C. Menu Rekap Konsumen',
            description:
              'Ringkasan saldo akumulasi per konsumen yang bisa dilihat dalam mode tampilan Kartu atau Tabel:',
            details: [
              'Klik kartu/baris untuk membuka rincian daftar faktur milik konsumen tersebut, menyalin ringkasan teks ("Salin"), membuka Tanda Terima Resmi, atau melompat ke Rekap Faktur ("Lihat Faktur").',
              'Pengaturan Hak & Coret Konsumen (Khusus Admin): Admin dapat mengubah hak paket per konsumen (Cashback + Parsel / Cashback / Parcel), mencoret atau memulihkan konsumen dari daftar penerima cashback, serta memproses pencairan.',
            ],
          },
          {
            title: 'D. Export Laporan ke Excel (.xlsx) (Khusus Admin)',
            description:
              'Admin dapat mengunduh laporan Excel dari menu Rekap Faktur, Rekap Konsumen, 10 Besar, Penerimaan Cashback, maupun Footer:',
            details: [
              'Format Lembar Tanda Terima & Parcel: Format siap cetak lengkap dengan kolom tanda tangan fisik dan status kelayakan Parcel.',
              'Format Rekap Komprehensif Akuntansi: Berisi sheet ringkasan eksekutif, rekap per konsumen, daftar faktur rinci, dan data master konsumen.',
            ],
          },
        ],
      },
      {
        id: 'step6',
        title: 'Langkah 6: Sinkronisasi Cloud, Backup (.JSON) & Reset Data',
        shortTitle: '6. Cloud & Backup',
        icon: Database,
        tag: 'Keamanan Data',
        summary:
          'Menjaga keamanan data multi-perangkat dengan Cloud Firestore, cadangan file lokal (.JSON), pemulihan data, dan pembersihan permanen.',
        steps: [
          {
            title: 'A. Sinkronisasi Cloud Real-Time & Mode Offline',
            description:
              'Seluruh transaksi faktur, master konsumen, aturan/profil perusahaan, dan pengajuan pembatalan tersinkronisasi otomatis ke Cloud Firestore:',
            details: [
              'Setiap perangkat yang terhubung otomatis menerima pembaruan data terbaru secara real-time.',
              'Penyimpanan lokal peramban dioptimalkan secara efisien agar tetap ringan dan tidak mudah penuh meskipun menyimpan ratusan foto bukti pencairan.',
              'Admin dapat memicu sinkronisasi manual kapan saja lewat menu Pengaturan -> tab "Cloud & Database" -> "Sinkronkan Sekarang".',
            ],
          },
          {
            title: 'B. Mengunduh Backup Mandiri (.JSON) & Restore (Khusus Admin)',
            description:
              'Disarankan membuat arsip cadangan berkala di menu Pengaturan -> tab "Cloud & Database":',
            details: [
              'Unduh File Cadangan (.JSON): Klik tombol biru untuk menyimpan salinan lengkap seluruh faktur, master konsumen, dan profil usaha ke komputer atau HP.',
              'Pulihkan dari File Backup (Restore): Pilih file .JSON cadangan -> periksa jumlah data pada konfirmasi -> klik "Ya, Pulihkan Sekarang" untuk mengembalikan data ke lokal dan Cloud.',
            ],
          },
          {
            title: 'C. Zona Bahaya: Hapus Semua Data Permanen (Khusus Admin)',
            description:
              'Digunakan hanya apabila Anda ingin membersihkan seluruh data transaksi dan master konsumen dari awal:',
            details: [
              'Buka Pengaturan -> tab "Cloud & Database" -> bagian merah "Hapus Semua Data Permanen".',
              'Ketik kata "HAPUS" pada kotak konfirmasi pengaman lalu konfirmasi penghapusan.',
            ],
            warning:
              'Penghapusan permanen akan menghapus data di browser dan Cloud Firestore serta tidak dapat dibatalkan. Selalu unduh file cadangan (.JSON) sebelum melakukan penghapusan.',
          },
        ],
      },
      {
        id: 'install_pwa',
        title: 'Panduan Instalasi di Semua Perangkat (Android, iOS & PC)',
        shortTitle: 'Instal di HP & PC',
        icon: Smartphone,
        tag: 'PWA Multi-Perangkat',
        summary:
          'Pasang CashbackPro langsung ke layar utama HP Android, iPhone/iPad, atau desktop PC agar berjalan seperti aplikasi native tanpa bilah browser.',
        steps: [
          {
            title: 'A. Memasang di Smartphone Android (Chrome / Edge)',
            description:
              'Jadikan CashbackPro sebagai ikon aplikasi di layar utama Android:',
            details: [
              'Buka CashbackPro lewat Google Chrome atau Microsoft Edge.',
              'Ketuk menu titik tiga (⋮) di pojok kanan atas browser -> pilih "Instal aplikasi" atau "Tambahkan ke Layar Utama".',
              'Atau (pada Mode Admin) buka Pengaturan -> tab "Cloud & Database" -> klik tombol "Instal Aplikasi" / "Lihat Panduan Instalasi Semua OS".',
            ],
            tips: 'Saat dibuka dari ikon layar utama, aplikasi berjalan dalam mode layar penuh (Full Screen) dengan respons cepat.',
          },
          {
            title: 'B. Memasang di iPhone & iPad (Apple Safari)',
            description:
              'Untuk perangkat iOS/iPadOS, instalasi dilakukan menggunakan browser Safari:',
            details: [
              'Buka website CashbackPro di Safari iPhone atau iPad.',
              'Ketuk ikon Bagikan / Share (kotak dengan panah ke atas di bilah browser).',
              'Pilih "Tambah ke Layar Utama" (Add to Home Screen) lalu ketuk "Tambah".',
            ],
          },
          {
            title: 'C. Memasang di Komputer PC / Laptop (Windows, Mac, Linux)',
            description:
              'Jalankan aplikasi dalam jendela desktop tersendiri untuk kasir maupun admin:',
            details: [
              'Buka aplikasi di Google Chrome atau Microsoft Edge pada PC/laptop.',
              'Klik ikon instal di sisi kanan bilah alamat URL (atau menu titik tiga -> "Simpan dan bagikan" -> "Instal halaman sebagai aplikasi").',
              'Aplikasi langsung memiliki jendela dan pintasan tersendiri di Desktop / Start Menu / Launchpad.',
            ],
          },
        ],
      },
      {
        id: 'faq',
        title: 'Tanya Jawab (FAQ) & Solusi Cepat',
        shortTitle: 'FAQ & Solusi',
        icon: HelpCircle,
        tag: 'Bantuan Cepat',
        summary:
          'Jawaban ringkas atas pertanyaan yang paling sering muncul saat pengoperasian harian oleh Admin maupun Petugas.',
        steps: [
          {
            title: 'Q: Mengapa di Mode Petugas saya bisa membuka halaman lain tetapi tidak bisa mengedit atau membuka Pengaturan?',
            description:
              'A: Mode Petugas memang dirancang agar petugas dapat memproses pencairan cashback di "Penerimaan Cashback" serta melihat informasi pada halaman Dashboard, 10 Besar, Rekap Faktur, Rekap Konsumen, dan Master Konsumen dalam mode lihat saja (Read-Only). Pengubahan data dan menu Pengaturan dikunci khusus untuk Mode Admin menggunakan PIN Admin.',
          },
          {
            title: 'Q: Bagaimana cara agar nama petugas langsung muncul otomatis setiap mencairkan cashback?',
            description:
              'A: Pada saat memproses pencairan pertama kali di suatu perangkat, isi kolom "Petugas Penyerah Cashback" (misalnya nama petugas yang bertugas di perangkat tersebut). Sistem otomatis mengingat nama tersebut khusus untuk perangkat itu pada transaksi berikutnya. Jika petugas berganti, klik tanda (×) di kolom petugas untuk menggantinya.',
          },
          {
            title: 'Q: Bagaimana jika petugas terlanjur mencairkan cashback untuk konsumen yang salah?',
            description:
              'A: Klik tombol "Ajukan Batal" pada konsumen tersebut di menu Penerimaan Cashback, isi nama petugas & alasan pembatalan. Setelah Admin memberikan persetujuan (ACC), tombol "Batalkan (ACC)" akan muncul di layar petugas untuk membatalkan status pencairan.',
          },
          {
            title: 'Q: Mengapa saat mencetak Tanda Terima Resmi muncul 2 halaman/rangkap?',
            description:
              'A: Sistem memang merancang cetakan Berita Acara Penyerahan Cashback dalam 2 rangkap resmi secara otomatis: Rangkap 1 (Asli) untuk diserahkan kepada Konsumen dan Rangkap 2 (Arsip) untuk dokumentasi Perusahaan.',
          },
          {
            title: 'Q: Apakah data Master Konsumen perlu diisi ulang satu per satu dari awal?',
            description:
              'A: Tidak perlu. Setiap kali faktur baru diinput atau diimpor dari Excel, sistem otomatis mendaftarkan dan menyelaraskan konsumen ke Master Konsumen agar selalu sesuai dengan data transaksi real tanpa duplikasi.',
          },
        ],
      },
    ],
    []
  );

  // Filtered sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter((s) => {
      const matchSection =
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.tag.toLowerCase().includes(q);
      const matchSteps = s.steps.some(
        (st) =>
          st.title.toLowerCase().includes(q) ||
          st.description.toLowerCase().includes(q) ||
          (st.details && st.details.some((d) => d.toLowerCase().includes(q))) ||
          (st.tips && st.tips.toLowerCase().includes(q)) ||
          (st.warning && st.warning.toLowerCase().includes(q))
      );
      return matchSection || matchSteps;
    });
  }, [sections, searchQuery]);

  const activeSection = useMemo(() => {
    const found = sections.find((s) => s.id === activeSectionId);
    return found || sections[0];
  }, [sections, activeSectionId]);

  const activeIndex = sections.findIndex((s) => s.id === activeSectionId);
  const prevSection = activeIndex > 0 ? sections[activeIndex - 1] : null;
  const nextSection = activeIndex < sections.length - 1 ? sections[activeIndex + 1] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Buku Panduan Penggunaan Lengkap
                </h2>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Panduan Fitur Terbaru
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Panduan operasional Mode Admin & Petugas, faktur, pencairan tunai, logo usaha, hingga backup data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Tutup Buku Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Quick Navigator Strip */}
        <div className="px-4 py-2.5 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik (misal: pin, petugas, acc, logo, tanda tangan, backup)..."
              className="w-full pl-9 pr-14 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded-md"
              >
                Reset
              </button>
            )}
          </div>

          {onOpenSettings && (
            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0"
            >
              {appRole === 'admin' ? (
                <>
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Buka Menu Pengaturan</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Masuk Mode Admin (PIN)</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Body Layout: Sidebar Navigation + Main Reading Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* Sidebar / Tabs list (Scrollable) */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-2 sm:p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5">
            {filteredSections.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 w-full">
                Tidak ada topik yang cocok dengan "{searchQuery}".
              </div>
            ) : (
              filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                const isActive = sec.id === activeSectionId;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 md:shrink md:w-full ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : 'text-slate-700 hover:bg-slate-200/60 bg-white/60 md:bg-transparent border border-slate-200 md:border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isActive ? 'bg-white/10 text-emerald-400' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{sec.shortTitle}</span>
                    </div>
                    <ChevronRight
                      className={`hidden md:block w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Reading View (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Active Topic Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeSection.tag}
                </span>
                <span className="text-[11px] text-slate-400">
                  Topik {activeIndex + 1} dari {sections.length}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-extrabold text-white leading-tight">
                {activeSection.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeSection.summary}
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-5">
              {activeSection.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Bullet details if any */}
                  {step.details && step.details.length > 0 && (
                    <div className="pl-9 space-y-1.5 pt-1">
                      {step.details.map((detail, dIdx) => (
                        <div key={dIdx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tips Callout */}
                  {step.tips && (
                    <div className="ml-9 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <strong className="font-semibold text-emerald-950">Tips Praktis: </strong>
                        {step.tips}
                      </div>
                    </div>
                  )}

                  {/* Warning Callout */}
                  {step.warning && (
                    <div className="ml-9 p-3 rounded-lg bg-red-50/70 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        <strong className="font-semibold text-red-950">Perhatian: </strong>
                        {step.warning}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Next/Prev Navigator */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
              {prevSection ? (
                <button
                  type="button"
                  onClick={() => setActiveSectionId(prevSection.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Sebelumnya:</span>
                  <span className="truncate max-w-[130px]">{prevSection.shortTitle}</span>
                </button>
              ) : (
                <div />
              )}

              {nextSection ? (
                <button
                  type="button"
                  onClick={() => setActiveSectionId(nextSection.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors ml-auto"
                >
                  <span className="hidden sm:inline">Selanjutnya:</span>
                  <span className="truncate max-w-[130px]">{nextSection.shortTitle}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors ml-auto"
                >
                  Selesai Membaca Panduan ✓
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 sm:px-6 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dokumentasi Resmi Sistem CashbackPro Rekapitulasi</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-900 font-semibold"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
