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
  FileSpreadsheet, 
  Upload, 
  Download, 
  ShieldCheck, 
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Percent,
  Wallet,
  Phone,
  Smartphone,
  Laptop
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
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
          'Memahami konsep dasar rekapitulasi cashback dari belanja konsumen hingga pencairan tunai (cash) per konsumen.',
        steps: [
          {
            title: '1. Siklus Hidup Cashback Konsumen',
            description:
              'Aplikasi CashbackPro dirancang untuk mengotomatisasi pencatatan promosi cashback toko dengan 4 tahap utama:',
            details: [
              'Pencatatan Belanja: Kasir atau admin menginput faktur penjualan atau mengimpor file Excel rekap.',
              'Kalkulasi Otomatis: Sistem secara otomatis menghitung besaran reward rupiah sesuai aturan (% Flat atau Tiered) yang aktif tanpa syarat minimal belanja.',
              'Penyimpanan Master Konsumen: Identitas konsumen (nama, no HP, alamat, metode Tunai/Cash) otomatis terhubung ke Master Data.',
              'Pencairan Tunai (Cash): Saat reward diserahkan tunai ke konsumen, status diubah menjadi Sudah Diterima dan Tanda Terima Resmi dicetak dalam 2 rangkap.',
            ],
            tips: 'Tidak perlu login manual atau sign-up. Sistem otomatis terhubung langsung ke Firebase Firestore Cloud untuk penyimpanan aman multi-perangkat.',
          },
          {
            title: '2. Fitur Unggulan yang Tersedia',
            description: 'Berbagai fasilitas canggih untuk mempermudah operasional toko Anda:',
            details: [
              'Hitung Otomatis: Ganti pengaturan cashback kapan saja, seluruh nilai reward faktur otomatis tersinkronisasi.',
              'Dukungan Excel Penuh: Tersedia template resmi import faktur dan import master konsumen, serta export akuntansi.',
              'Filter Tanggal Universal: Saring omset dan riwayat berdasarkan rentang waktu spesifik (misal: 1 Jan 2026 - 31 Des 2026).',
              'Bukti Tanda Terima & WhatsApp: Cetak format profesional atau kirim notifikasi pencairan langsung ke chat WhatsApp konsumen.',
              'Keamanan & Backup: Unduh cadangan file (.JSON) dan pulihkan data kapan pun dibutuhkan.',
            ],
          },
        ],
      },
      {
        id: 'step1',
        title: 'Langkah 1: Mengatur Kebijakan & Persentase Cashback',
        shortTitle: '1. Aturan Cashback',
        icon: SettingsIcon,
        tag: 'Konfigurasi',
        summary:
          'Langkah awal sebelum memulai transaksi adalah menentukan skema reward dan nama toko Anda di menu Pengaturan.',
        steps: [
          {
            title: 'A. Mengisi Nama Toko / Usaha',
            description:
              'Buka menu Pengaturan (ikon roda gigi di navigasi). Masukkan nama usaha Anda pada kolom "Nama Toko / Usaha". Nama ini akan otomatis tercetak di tanda terima dan file export Excel.',
          },
          {
            title: 'B. Memilih Mode Skema Perhitungan Cashback',
            description: 'Pilih salah satu dari 2 skema yang sesuai dengan strategi promosi toko:',
            details: [
              'Mode Flat (Persentase Tetap): Semua transaksi mendapatkan persentase cashback yang sama, misalnya 2% atau 3% dari total belanja.',
              'Mode Tiered (Bertingkat): Persentase meningkat seiring besarnya nominal belanja. Contoh: Belanja Rp 1-2 Juta (2.5%), Rp 2-5 Juta (5%), > Rp 5 Juta (7.5%).',
            ],
            tips: 'Jika Anda mengubah persentase di masa mendatang, seluruh faktur yang ada dapat otomatis dihitung ulang secara massal ke rate baru.',
          },
          {
            title: 'C. Menentukan Pembulatan, Paket & Masa Berlaku',
            description: 'Atur ketentuan tambahan agar pengeluaran promosi tetap terkontrol:',
            details: [
              'Tanpa Batas Minimal Belanja: Seluruh transaksi belanja langsung dihitung cashback-nya tanpa syarat minimum pembelian.',
              'Batas Maksimal Reward: Opsi pembatasan cashback maksimum per transaksi (misal: maksimal Rp 500.000).',
              'Metode Pembulatan: Pilih pembulatan eksak, ratusan terdekat, atau ribuan terdekat.',
              'Masa Berlaku Klaim: Jumlah hari sebelum reward dinyatakan kedaluwarsa (misal: 30 hari).',
              'Target Belanja Parcel: Nilai akumulasi belanja untuk mendapatkan bingkisan parsel (Cashback + Parsel / Cashback / Parcel).',
            ],
          },
          {
            title: 'D. Menguji Coba di Simulator Langsung',
            description:
              'Sebelum menekan "Terapkan Pengaturan", ketikkan angka belanja pada panel Simulator Pengujian di bagian bawah form untuk memastikan formula dan rate efektif sudah sesuai harapan.',
          },
          {
            title: 'E. Mengatur Posisi Navigasi (Tampilan)',
            description:
              'Anda dapat memilih tata letak navigasi sesuai kenyamanan: Di Samping (Sidebar), Di Atas (Top Bar), atau Di Bawah (Thumb Dock yang sangat nyaman di layar HP).',
          },
        ],
      },
      {
        id: 'step2',
        title: 'Langkah 2: Mengelola Master Data Konsumen',
        shortTitle: '2. Master Konsumen',
        icon: Users,
        tag: 'Database Pelanggan',
        summary:
          'Menyimpan profil identitas pelanggan dan preferensi pencairan Tunai (Cash) secara terpusat.',
        steps: [
          {
            title: 'A. Mendaftarkan Konsumen Secara Manual',
            description:
              'Buka tab "Master Konsumen" -> klik tombol hitam "+ Tambah Konsumen Baru". Masukkan Nama Lengkap, Nomor WhatsApp (awalan 08), Kota, dan Alamat Lengkap. Metode pencairan otomatis ditetapkan ke Tunai (Cash).',
            tips: 'Format nomor telepon otomatis dinormalisasi oleh sistem agar siap digunakan untuk klik pesan WhatsApp instan.',
          },
          {
            title: 'B. Pendaftaran Otomatis (Auto-Enrollment)',
            description:
              'Anda tidak harus mendaftarkan konsumen terlebih dahulu di menu Master. Saat Anda menginput faktur baru dengan nama atau nomor HP yang belum ada, sistem secara otomatis mendaftarkannya ke Master Data Konsumen!',
          },
          {
            title: 'C. Import Data Konsumen dari File Excel',
            description:
              'Jika Anda sudah memiliki ratusan data konsumen lama di Excel:',
            details: [
              'Klik tombol "Import Excel" di header menu Master Konsumen.',
              'Klik tombol "Unduh Template Excel" untuk mendapatkan format kolom resmi (.xlsx).',
              'Isi kolom: Nama Konsumen, No WhatsApp, Email, Kota, Alamat, dan Catatan (Metode Pencairan otomatis Tunai/Cash).',
              'Upload file Excel ke modal. Sistem akan memvalidasi nomor telepon dan mendeteksi jika ada data duplikat.',
              'Klik "Simpan Konsumen ke Database" untuk memasukkan semua baris ke Master Data & Firebase Cloud.',
            ],
          },
          {
            title: 'D. Export Master Konsumen',
            description:
              'Klik tombol "Export Master" untuk mengunduh seluruh daftar konsumen yang terdaftar beserta akumulasi omset belanjanya dalam format Excel (.xlsx).',
          },
        ],
      },
      {
        id: 'step3',
        title: 'Langkah 3: Input & Import Faktur Transaksi Belanja',
        shortTitle: '3. Input Faktur',
        icon: Receipt,
        tag: 'Pencatatan Transaksi',
        summary:
          'Mencatat transaksi penjualan toko secara manual atau mengimpor puluhan nota sekaligus via Excel.',
        steps: [
          {
            title: 'A. Menginput Faktur Baru Manual',
            description: 'Klik tombol "+ Tambah Faktur" pada bilah atas atau tab Faktur:',
            details: [
              'Nomor Faktur: Sistem otomatis membuat nomor unik (contoh: INV-2026-001), Anda bisa menggantinya sesuai nomor nota fisik toko.',
              'Tanggal Transaksi: Tentukan tanggal belanja konsumen.',
              'Pilih Konsumen: Ketik nama atau nomor HP di kolom pencarian konsumen untuk memilih dari Master Data. Jika nama baru, ketik langsung.',
              'Rincian Belanja: Tuliskan nama barang atau jenis produk yang dibeli konsumen.',
              'Total Belanja (Rp): Masukkan nominal kotor belanja. Sistem langsung menampilkan persentase dan rupiah cashback otomatis di bawah kolom.',
              'Metode Pencairan: Otomatis Tunai (Cash) untuk semua pencairan.',
            ],
          },
          {
            title: 'B. Import Faktur Massal dari Excel',
            description:
              'Untuk toko dengan volume transaksi harian tinggi, gunakan fitur Import Excel:',
            details: [
              'Klik tombol "Import Excel" di menu Faktur atau Footer aplikasi.',
              'Klik "Unduh Template Excel" untuk mengunduh template faktur resmi.',
              'Isi baris transaksi: Nomor Faktur, Tanggal (YYYY-MM-DD), Nama Konsumen, No HP, Deskripsi Barang, Total Belanja, Metode Pencairan, dan Status.',
              'Tarik dan lepas file Excel ke kotak upload.',
              'Periksa pratinjau tabel validasi. Jika konsumen belum ada, sistem akan otomatis mencatatnya sebagai konsumen baru.',
              'Klik tombol "Selesaikan Import Faktur" untuk menyimpan seluruh data.',
            ],
          },
          {
            title: 'C. Menggunakan Filter Rentang Tanggal Global',
            description:
              'Gunakan filter tanggal di bagian atas layar (misal: 1 Jan 2026 s/d 30 Des 2026). Saat filter aktif, seluruh omset belanja, cashback, dan leaderboard otomatis disesuaikan hanya untuk periode yang dipilih.',
          },
        ],
      },
      {
        id: 'step4',
        title: 'Langkah 4: Proses Klaim, Pencairan Saldo & WhatsApp',
        shortTitle: '4. Pencairan Saldo',
        icon: Send,
        tag: 'Klaim & Payout',
        summary:
          'Mengelola status pembayaran reward, mencetak bukti tanda terima, dan mengirim rincian via WhatsApp.',
        steps: [
          {
            title: 'A. Memahami 3 Status Klaim',
            description: 'Tiap faktur memiliki status pembayaran cashback yang jelas:',
            details: [
              'Pending (Menunggu): Faktur baru dicatat dan menunggu proses pencairan.',
              'Ready (Siap Cair): Cashback siap dicairkan secara tunai (cash) kepada konsumen.',
              'Disbursed (Tercairkan): Dana cashback telah diserahkan secara tunai (cash) beserta tanda tangan penerima dan dokumentasi.',
            ],
            tips: 'Anda dapat mengatur jumlah baris yang ditampilkan pada setiap halaman di semua tabel rekap.',
          },
          {
            title: 'B. Melihat & Mencetak Tanda Terima Resmi (2 Rangkap)',
            description:
              'Klik tombol "Tanda Terima Resmi" pada Rekap Konsumen atau Penerimaan Cashback untuk membuka dokumen Berita Acara resmi. Saat dicetak atau disimpan ke PDF, sistem otomatis mencetak tepat 2 rangkap (Rangkap 1 Asli untuk Konsumen dan Rangkap 2 Arsip untuk Perusahaan).',
          },
          {
            title: 'C. Mengirimkan Notifikasi ke WhatsApp Konsumen',
            description:
              'Di dalam jendela Tanda Terima Digital, klik tombol hijau "Kirim via WhatsApp":',
            details: [
              'Sistem akan otomatis membuka aplikasi WhatsApp atau WhatsApp Web.',
              'Pesan rincian cashback telah tersusun rapi dengan nama toko, nomor faktur, nominal belanja, jumlah cashback, dan status klaim.',
              'Anda tinggal menekan tombol Kirim di WhatsApp tanpa perlu mengetik ulang!',
            ],
            tips: 'Metode ini aman dan bebas dari blokir popup peramban karena menggunakan tautan dinamis.',
          },
        ],
      },
      {
        id: 'step5',
        title: 'Langkah 5: Monitoring Dashboard & Export Laporan Excel',
        shortTitle: '5. Dashboard & Laporan',
        icon: BarChart3,
        tag: 'Analitik & Arsip',
        summary:
          'Melihat performa omset, mengapresiasi konsumen paling loyal, dan mengekspor laporan akuntansi toko.',
        steps: [
          {
            title: 'A. Tab Dashboard Analytics',
            description: 'Memantau kesehatan keuangan promosi cashback secara real-time:',
            details: [
              'Total Omset Belanja: Akumulasi seluruh nilai penjualan yang tercatat.',
              'Total Liabilitas Cashback: Jumlah dana reward yang dijanjikan ke konsumen.',
              'Status Klaim Terurai: Rincian rupiah saldo yang sudah cair vs yang masih siap cair atau pending.',
              'Rasio Cashback Efektif: Persentase rata-rata pengeluaran reward terhadap omset kotor toko.',
            ],
          },
          {
            title: 'B. Tab Top 10 Konsumen (Leaderboard Loyalitas)',
            description:
              'Melihat daftar 10 pelanggan dengan total belanja terbesar. Dilengkapi indikator badge hadiah Parcel bagi pelanggan yang telah melewati batas akumulasi belanja tahunan.',
          },
          {
            title: 'C. Tab Rekapitulasi Konsumen',
            description:
              'Menampilkan ringkasan gabungan per pelanggan: berapa kali bertransaksi, total belanja keseluruhan, total cashback yang diperoleh, dan metode pencairan favorit.',
          },
          {
            title: 'D. Mengekspor Laporan ke Excel (.xlsx)',
            description:
              'Klik tombol "Export Excel" pada bilah atas untuk membuka jendela pilihan format export:',
            details: [
              'Format 1 - Rekap Lengkap Akuntansi: Berisi sheet Faktur Rinci, sheet Rekap Konsumen, sheet Leaderboard, dan Ringkasan KPI Finansial.',
              'Format 2 - Ringkasan Per Konsumen: Khusus daftar rekapitulasi saldo dan nomor rekening konsumen.',
              'Format 3 - Lembar Tanda Terima Cetak: Template siap cetak dengan kotak tanda tangan untuk bukti penerimaan dana fisik.',
            ],
          },
        ],
      },
      {
        id: 'step6',
        title: 'Langkah 6: Backup Data & Keamanan Database Cloud',
        shortTitle: '6. Backup & Keamanan',
        icon: Database,
        tag: 'Keamanan Data',
        summary:
          'Menjaga cadangan data toko agar aman dan cara mengosongkan database bila diperlukan.',
        steps: [
          {
            title: 'A. Mengunduh File Backup Mandiri (.JSON)',
            description:
              'Sangat disarankan mengunduh cadangan secara rutin (misal setiap akhir pekan atau akhir bulan):',
            details: [
              'Buka menu Pengaturan.',
              'Scroll ke bagian "Backup & Pemulihan Data".',
              'Klik tombol "Unduh Backup Data (.JSON)".',
              'File cadangan lengkap berisi seluruh faktur, konsumen, dan konfigurasi toko akan tersimpan di komputer/HP Anda.',
            ],
          },
          {
            title: 'B. Memulihkan Data (Restore Backup)',
            description:
              'Jika Anda berganti perangkat atau ingin mengembalikan kondisi data sebelumnya:',
            details: [
              'Buka menu Pengaturan -> "Backup & Pemulihan Data".',
              'Klik tombol "Pulihkan / Restore dari Backup".',
              'Pilih file .JSON backup Anda.',
              'Sistem akan menampilkan ringkasan jumlah faktur dan konsumen di dalam file.',
              'Klik "Ya, Pulihkan Sekarang" untuk memuat kembali seluruh data ke lokal dan cloud.',
            ],
          },
          {
            title: 'C. Hapus Semua Data Permanen (Pembersihan Bersih)',
            description:
              'Jika Anda ingin mengulang sistem dari awal dan menghapus seluruh transaksi demo:',
            details: [
              'Buka menu Pengaturan -> bagian merah "Hapus Semua Data Permanen".',
              'Klik "Hapus Semua Data Permanen".',
              'Ketikkan kata "HAPUS" pada kolom pengaman konfirmasi.',
              'Klik tombol merah konfirmasi untuk menghapus seluruh faktur dan master konsumen secara permanen dari browser dan Firebase Firestore Cloud.',
            ],
            warning:
              'Tindakan ini tidak dapat dibatalkan! Selalu unduh file Backup Data (.JSON) terlebih dahulu sebelum melakukan pembersihan permanen.',
          },
        ],
      },
      {
        id: 'install_pwa',
        title: 'Panduan Instalasi di Semua Perangkat (Android, iOS & PC)',
        shortTitle: 'Instal di Semua HP & PC',
        icon: Smartphone,
        tag: 'PWA Multi-Perangkat',
        summary:
          'Aplikasi CashbackPro dapat dipasang langsung ke layar utama HP Android, iPhone / iPad, atau desktop PC tanpa perlu ke Play Store atau App Store.',
        steps: [
          {
            title: 'A. Cara Pasang di Smartphone Android (Chrome, Edge, Samsung Internet)',
            description:
              'Aplikasi dapat dipasang langsung menjadi icon aplikasi di homescreen Android Anda:',
            details: [
              'Buka website CashbackPro menggunakan Google Chrome atau Microsoft Edge.',
              'Ketuk tombol "Instal App" di navigasi atas atau buka menu Pengaturan -> "Instal Aplikasi ke Perangkat".',
              'Atau ketuk menu titik tiga (⋮) di pojok kanan atas browser -> pilih "Instal aplikasi" atau "Tambahkan ke Layar Utama".',
              'Ketuk "Instal". CashbackPro akan otomatis muncul di laci aplikasi (app drawer) & layar depan.',
            ],
            tips: 'Saat dibuka dari layar utama, aplikasi berjalan dalam mode layar penuh (Full Screen) tanpa kolom URL browser.',
          },
          {
            title: 'B. Cara Pasang di iPhone & iPad (Apple Safari)',
            description:
              'Untuk pengguna Apple iOS, instalasi dilakukan melalui fitur "Add to Home Screen" di Safari:',
            details: [
              'Buka website CashbackPro menggunakan browser resmi Safari di iPhone atau iPad.',
              'Ketuk tombol Bagikan / Share (ikon kotak dengan tanda panah mengarah ke atas di bilah bawah).',
              'Gulir menu tindakan ke bawah dan ketuk "Tambah ke Layar Utama" (Add to Home Screen).',
              'Beri nama (default: CashbackPro) lalu ketuk "Tambah" di pojok kanan atas.',
              'Ikon CashbackPro langsung muncul di layar utama iOS Anda dengan logo resmi.',
            ],
            tips: 'Data Anda tetap tersimpan di perangkat dan otomatis tersinkronisasi ke Cloud Firebase Firestore.',
          },
          {
            title: 'C. Cara Pasang di Komputer PC / Laptop (Windows, Mac, Linux)',
            description:
              'Dapat dijalankan sebagai aplikasi desktop tersendiri layaknya software native:',
            details: [
              'Buka aplikasi menggunakan Google Chrome atau Microsoft Edge di PC / Laptop Anda.',
              'Perhatikan bilah alamat (URL bar) di kanan atas, klik ikon komputer/instal (⊕ atau monitor kecil).',
              'Atau klik menu titik tiga (⋮) Chrome -> "Simpan dan bagikan" -> "Instal halaman sebagai aplikasi".',
              'Klik "Instal". Aplikasi akan memiliki jendela tersendiri dan ikon shortcut di Desktop / Start Menu Windows / Mac Launchpad.',
            ],
            tips: 'Aplikasi desktop sangat nyaman untuk kasir toko dengan layar monitor besar.',
          },
        ],
      },
      {
        id: 'faq',
        title: 'Tanya Jawab (FAQ) & Tips Trik Penting',
        shortTitle: 'FAQ & Tips',
        icon: HelpCircle,
        tag: 'Bantuan Tambahan',
        summary: 'Pertanyaan yang sering diajukan seputar operasional harian aplikasi.',
        steps: [
          {
            title: 'Q: Apakah aplikasi membutuhkan login akun Google setiap kali dibuka?',
            description:
              'A: Tidak perlu. Aplikasi telah terintegrasi dengan koneksi otomatis ke Firebase Cloud Firestore secara langsung. Anda bisa langsung membuka dan menginput data tanpa hambatan login.',
          },
          {
            title: 'Q: Bagaimana jika persentase cashback toko diubah dari 2% menjadi 3%?',
            description:
              'A: Cukup buka menu Pengaturan, ubah angka ke 3%, lalu simpan. Sistem secara cerdas akan otomatis menghitung ulang seluruh faktur yang ada di database sesuai persentase baru secara massal.',
          },
          {
            title: 'Q: Apakah data saya aman jika browser di-refresh atau cache dibersihkan?',
            description:
              'A: Sangat aman! Data Anda tersimpan secara ganda: di LocalStorage browser untuk akses instan dan di Firebase Cloud Firestore yang selalu tersinkronisasi secara real-time.',
          },
          {
            title: 'Q: Bagaimana cara mengirim rincian cashback ke WA konsumen?',
            description:
              'A: Klik ikon dokumen/tanda terima pada faktur yang bersangkutan, lalu klik tombol "Kirim via WhatsApp". Pastikan nomor HP konsumen menggunakan format 08 atau 62.',
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
          (st.tips && st.tips.toLowerCase().includes(q))
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
                  Langkah demi Langkah
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Petunjuk detail pengoperasian fitur pencatatan, kalkulasi, pencairan cashback, dan backup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
              placeholder="Cari topik panduan (misal: import, backup, whatsapp, flat, rumus)..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md"
              >
                Clear
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
              <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Buka Menu Pengaturan</span>
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
              filteredSections.map((sec, idx) => {
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
                      <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/10 text-emerald-400' : 'bg-slate-200 text-slate-700'}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{sec.shortTitle}</span>
                    </div>
                    <ChevronRight className={`hidden md:block w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
            <span>Dokumentasi Resmi Sistem CashbackPro Rekapitulasi v2.0</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-900 font-semibold"
          >
            Tutup Panduan (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
