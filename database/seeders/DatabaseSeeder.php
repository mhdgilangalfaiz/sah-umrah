<?php

namespace Database\Seeders;

use App\Models\ChatbotIntent;
use App\Models\Faq;
use App\Models\Flight;
use App\Models\Package;
use App\Models\Page;
use App\Models\Post;
use App\Models\Setting;
use App\Models\Testimonial;
use App\Models\User;
use App\Models\VisaService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Akun admin: Super Admin (lihat pembelian & laporan, buat akun admin) + Admin (kelola website) ----------
        $make = function (string $name, string $email, string $role, bool $primary = false) {
            $u = new User(['name' => $name, 'email' => $email, 'password' => env('SEED_ADMIN_PASSWORD', 'Admin#SAH2026')]);
            $u->forceFill(['role' => $role, 'is_primary_admin' => $primary, 'is_active' => true, 'email_verified_at' => now()])->save();

            return $u;
        };
        $make('Super Admin SAH', env('SEED_SUPERADMIN_EMAIL', 'superadmin@sah.co.id'), User::ROLE_SUPER_ADMIN, true);
        $owner = $make('Admin SAH', env('SEED_ADMIN_EMAIL', 'admin@sah.co.id'), User::ROLE_ADMIN);

        // ---------- Pelanggan demo ----------
        $demo = User::create([
            'name' => 'Jaya Pratama', 'email' => 'jaya.demo@gmail.com', 'password' => 'Jamaah123',
            'phone' => '081234567890', 'nik' => '1271010101900001', 'birth_place' => 'Medan', 'birth_date' => '1990-01-01',
            'gender' => 'L', 'address' => 'Jl. Gatot Subroto No. 10', 'city' => 'Medan',
            'email_verified_at' => now(), 'profile_completed_at' => now(), 'pdp_consent_at' => now(),
        ]);
        $self = $demo->jamaah()->create(['full_name' => 'Jaya Pratama', 'relation' => 'diri_sendiri', 'gender' => 'L', 'birth_date' => '1990-01-01',
            'nik' => '1271010101900001', 'passport_number' => 'C1234567', 'passport_expiry' => now()->addYears(4)->toDateString(), 'birth_place' => 'Medan']);
        $demo->jamaah()->create(['full_name' => 'Siti Aminah', 'relation' => 'istri', 'gender' => 'P', 'birth_date' => '1992-05-12',
            'passport_number' => 'C7654321', 'passport_expiry' => now()->addYears(3)->toDateString(), 'mahram_id' => $self->id, 'mahram_relation' => 'suami']);

        // ---------- Paket umrah (sesuai brosur resmi + poster) ----------
        $this->call(PackageSeeder::class);

        // ---------- Seat penerbangan (contoh; di produksi diinput manual admin dari mitra) ----------
        $this->call(FlightSeeder::class);

        // ---------- Layanan visa ----------
        VisaService::create([
            'name' => 'Visa Umrah', 'price' => 0, 'price_usd' => 135, 'processing_days' => 7,
            'description' => 'Pengurusan visa umrah resmi melalui provider terdaftar. Cocok untuk jamaah mandiri maupun rombongan/travel mitra.',
            'requirements' => ['Scan paspor (halaman biodata) berlaku minimal 8 bulan', 'Pas foto latar putih ukuran 4x6 (JPG)', 'Scan KTP & Kartu Keluarga',
                'Buku nikah / akta lahir untuk mahram', 'Tiket pesawat PP (bila sudah ada)', 'Semua berkas dikompres dalam satu file ZIP/RAR'],
        ]);

        // ---------- Halaman statis ----------
        $pages = [
            'tentang-kami' => ['Tentang Kami', '<h2>PT. Sumatera Andalan Haramain</h2><p>Kami adalah Penyelenggara Perjalanan Ibadah Umrah (PPIU) resmi berizin Kementerian Agama RI yang berkantor pusat di Kota Medan. Sejak berdiri, kami telah memberangkatkan ribuan jamaah dari Sumatera Utara dan sekitarnya ke Tanah Suci.</p><h3>Visi</h3><p>Menjadi biro perjalanan umrah paling terpercaya di Sumatera dengan layanan yang amanah, transparan, dan nyaman.</p><h3>Misi</h3><ul><li>Memberikan bimbingan ibadah sesuai sunnah.</li><li>Menjamin transparansi biaya dan transaksi melalui sistem terintegrasi.</li><li>Mengutamakan kenyamanan dan keselamatan jamaah.</li></ul>'],
            'kontak' => ['Kontak & Alamat Kantor', '<p>Silakan kunjungi kantor kami atau hubungi kami melalui <b>Pusat Bantuan</b> (chat di pojok kanan bawah) untuk konsultasi. Seluruh percakapan tercatat sehingga tim kami dapat melayani Anda dengan lebih baik.</p>'],
            'syarat-ketentuan' => ['Syarat & Ketentuan', '<h3>1. Pendaftaran</h3><p>Pendaftaran dianggap sah setelah pembayaran deposit awal diterima oleh sistem.</p><h3>2. Pembayaran</h3><p>Seluruh pembayaran WAJIB melalui Virtual Account (Mandiri, BSI, Muamalat) atau QRIS yang diterbitkan sistem. Kami tidak menerima transfer ke rekening pribadi.</p><h3>3. Cicilan</h3><p>Deposit awal minimal Rp3.000.000 per jamaah. Sisa pembayaran dapat dicicil dengan nominal fleksibel dan wajib lunas paling lambat H-30 sebelum keberangkatan.</p><h3>4. Dokumen</h3><p>Jamaah wajib mengunggah dokumen yang valid. Paspor harus berlaku minimal 8 bulan dari tanggal keberangkatan.</p>'],
            'kebijakan-privasi' => ['Kebijakan Privasi', '<p>Kami memproses data pribadi Anda sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).</p><h3>Data yang dikumpulkan</h3><ul><li>Identitas: nama, NIK, tanggal lahir, paspor.</li><li>Kontak: email, nomor telepon, alamat.</li><li>Dokumen perjalanan dan transaksi.</li></ul><h3>Perlindungan</h3><p>NIK, nomor paspor, dan seluruh dokumen dienkripsi dan disimpan pada penyimpanan privat yang hanya dapat diakses melalui tautan bertanda tangan berbatas waktu. Kami tidak menyimpan data kartu pembayaran.</p><h3>Hak Anda</h3><p>Anda berhak mengakses, memperbaiki, dan meminta penghapusan data melalui Pusat Bantuan.</p>'],
            'kebijakan-refund' => ['Kebijakan Refund', '<h3>Ketentuan Pembatalan Umrah</h3><ul><li>Pembatalan &gt; 60 hari sebelum keberangkatan: dana kembali 100% dikurangi biaya administrasi Rp500.000.</li><li>Pembatalan 30–60 hari: potongan 25% dari total dibayar.</li><li>Pembatalan &lt; 30 hari: potongan 50% (tiket & visa yang telah terbit tidak dapat dikembalikan).</li></ul><h3>Kesalahan Sistem / Pembayaran Ganda</h3><p>Bila terjadi kesalahan (mis. pembayaran ganda atau nominal salah), dana dikembalikan 100%.</p><h3>Cara Pengajuan</h3><p>Ajukan melalui <b>Dashboard › Refund</b>, sertakan <b>foto bukti</b> (mis. foto paspor/identitas dan bukti kesalahan) serta rekening tujuan atas nama pemesan. Refund diproses maksimal 14 hari kerja setelah disetujui tim Finance.</p>'],
        ];
        foreach ($pages as $slug => [$title, $content]) {
            Page::create(compact('slug', 'title', 'content'));
        }

        foreach (Setting::DEFAULTS as $key => $value) {
            Setting::create(compact('key', 'value'));
        }

        // ---------- FAQ ----------
        $faqs = [
            ['Apakah PT. Sumatera Andalan Haramain berizin resmi?', 'Ya, kami adalah PPIU resmi berizin Kementerian Agama RI. Nomor izin tercantum di bagian bawah setiap halaman.'],
            ['Bagaimana cara mendaftar umrah?', 'Buat akun (wajib email @gmail.com), pilih paket & jadwal, isi data jamaah, lalu bayar deposit melalui VA atau QRIS. Kursi langsung terkonfirmasi setelah pembayaran diterima sistem.'],
            ['Apakah bisa dicicil?', 'Bisa. Bayar deposit awal minimal Rp3.000.000 per jamaah, kemudian cicil dengan nominal bebas hingga lunas paling lambat H-30 sebelum keberangkatan.'],
            ['Metode pembayaran apa saja yang tersedia?', 'Virtual Account Bank Mandiri, BSI, Bank Muamalat, dan QRIS (semua e-wallet & m-banking). Semua pembayaran hanya melalui sistem.'],
            ['Bagaimana jika saya ingin membatalkan?', 'Ajukan refund melalui dashboard dengan melampirkan foto bukti. Besaran pengembalian mengikuti Kebijakan Refund.'],
            ['Dari kota mana keberangkatannya?', 'Keberangkatan utama dari Bandara Internasional Kualanamu, Medan (KNO). Untuk jamaah dari luar Medan, tim kami dapat membantu mengatur penerbangan penghubung.'],
            ['Apakah ada manasik dan pembimbing selama di Tanah Suci?', 'Ada. Jamaah mengikuti manasik umrah 2x sebelum berangkat, dan selama di Tanah Suci didampingi muthawwif bersertifikat serta tour leader dari Medan.'],
            ['Apa saja yang termasuk dalam harga paket?', 'Tiket pesawat PP, visa umrah, hotel sesuai paket, makan 3x sehari, muthawwif & tour leader, manasik, perlengkapan umrah, air zam-zam, asuransi perjalanan, dan bus AC. Rincian lengkap ada di halaman setiap paket.'],
            ['Bagaimana cara konsultasi?','Gunakan Pusat Bantuan (ikon chat di pojok kanan bawah). Asisten otomatis akan menjawab, dan Anda dapat dihubungkan langsung dengan admin kapan saja.'],
        ];
        foreach ($faqs as $i => [$q, $a]) Faq::create(['question' => $q, 'answer' => $a, 'sort' => $i]);

        // ---------- Testimoni ----------
        foreach ([
            ['Hj. Rosmawati', 'Medan', 'Alhamdulillah pelayanan sangat amanah. Hotel dekat sekali dengan Masjidil Haram, muthawwif sabar membimbing kami yang sudah sepuh.'],
            ['Bapak Syahrial', 'Binjai', 'Sistem cicilannya sangat membantu, bisa bayar sedikit-sedikit dan semua tercatat jelas di dashboard. Tidak perlu khawatir uang hilang.'],
            ['Ibu Nurhayati', 'Deli Serdang', 'Proses dokumen dan visa cepat, statusnya bisa dipantau langsung. Insya Allah tahun depan berangkat lagi bersama SAH.'],
        ] as [$n, $c, $t]) Testimonial::create(['name' => $n, 'city' => $c, 'content' => $t, 'rating' => 5]);

        // ---------- Basis jawaban chatbox ----------
        $intents = [
            ['Informasi paket umrah', 'umrah', 'informasi paket umrah, paket umrah, paket, harga umrah, biaya umrah, berapa harga, jadwal umrah, keberangkatan', "Kami memiliki paket umrah 9, 12, dan 15 hari (Hemat, Reguler, Plus Turki, dan VIP) dengan keberangkatan dari Medan (KNO). Harga mulai sekitar Rp25 jutaan per orang tergantung tipe kamar.\n\nDetail itinerary, hotel, dan sisa kuota real-time dapat dilihat di menu *Paket Umrah*.", ['Cara Pembayaran & Cicilan', 'Dokumen yang diperlukan']],
            ['Cara pembayaran & cicilan', 'pembayaran', 'cara pembayaran & cicilan, cicilan, cicil, dp, deposit, uang muka, bayar, pembayaran, va, virtual account, qris, transfer', "Pembayaran HANYA melalui sistem: Virtual Account Mandiri, BSI, Muamalat, atau QRIS.\n\nSkema cicilan:\n1. Deposit awal minimal Rp3.000.000 per jamaah untuk mengamankan kursi.\n2. Sisa tagihan bisa dicicil dengan nominal bebas (minimal Rp500.000 per pembayaran).\n3. Wajib lunas paling lambat H-30 sebelum keberangkatan.\n\nSetiap pembayaran otomatis mengurangi sisa tagihan dan kwitansi langsung terbit.", ['Informasi Paket Umrah']],
            ['Pemesanan tiket pesawat', 'tiket', 'pemesanan tiket pesawat, tiket, pesawat, penerbangan, jeddah, madinah, maskapai, bagasi', "Anda dapat mencari dan memesan tiket rute Indonesia ↔ Jeddah/Madinah di menu *Tiket Pesawat*. Pilih jadwal, isi data penumpang sesuai paspor, lalu bayar melalui VA/QRIS. E-ticket akan dikirim ke email dan tersedia di dashboard setelah diterbitkan.", ['Kebijakan refund & reschedule']],
            ['Kebijakan refund & reschedule tiket', 'tiket', 'kebijakan refund & reschedule, reschedule, ubah jadwal, refund tiket, batal tiket', 'Kebijakan refund dan reschedule berbeda untuk tiap maskapai dan ditampilkan pada setiap hasil pencarian tiket. Pengajuan dilakukan melalui menu Dashboard › Refund.', []],
            ['Layanan visa umrah', 'visa', 'layanan visa umrah, visa, pengajuan visa, urus visa, visa umrah', "Alur layanan visa:\n1. Ajukan visa & isi jumlah pemohon.\n2. Admin menerbitkan invoice.\n3. Bayar melalui VA/QRIS.\n4. Unggah berkas dalam satu file ZIP/RAR.\n5. Admin memverifikasi dan memproses.\n6. Visa terbit dan dapat diunduh di dashboard.\n\nEstimasi proses ±7 hari kerja.", ['Dokumen yang diperlukan']],
            ['Dokumen yang diperlukan', 'dokumen', 'dokumen yang diperlukan, dokumen, syarat, persyaratan, paspor, foto, kk, buku nikah, berkas', "Dokumen umum yang diperlukan:\n• Paspor berlaku minimal 8 bulan\n• Pas foto 4x6 latar putih\n• KTP & Kartu Keluarga\n• Buku nikah (suami-istri) / akta lahir (anak)\n• Sertifikat vaksin meningitis\n\nUnggah melalui Dashboard › Dokumen. Semua dokumen dienkripsi dan hanya dapat diakses oleh Anda dan petugas verifikasi.", []],
            ['Mahram', 'umrah', 'mahram, wanita sendiri, perempuan sendiri, tanpa suami', 'Jamaah wanita di bawah 45 tahun dianjurkan berangkat bersama mahram. Data mahram dapat diisi pada saat checkout atau di menu Data Jamaah.', []],
            ['Alamat kantor', 'umum', 'alamat, kantor, lokasi, dimana, jam buka, jam kerja', 'Kantor kami berada di Kota Medan. Alamat lengkap dan peta tersedia di halaman *Kontak*. Jam layanan: Senin – Sabtu, 08.30 – 17.00 WIB.', []],
            ['Salam', 'umum', 'assalamualaikum, assalamu, halo, hai, selamat pagi, selamat siang, selamat sore, selamat malam', "Wa'alaikumussalam warahmatullahi wabarakatuh 🙏\nAda yang dapat kami bantu? Silakan pilih topik atau ketik pertanyaan Anda.", ['Informasi Paket Umrah', 'Cara Pembayaran & Cicilan', 'Layanan Visa Umrah']],
            ['Terima kasih', 'umum', 'terima kasih, makasih, thanks, syukron, jazakallah', 'Sama-sama, semoga Allah memudahkan niat ibadah Anda. 🤲 Jika ada pertanyaan lain, kami siap membantu.', []],
        ];
        foreach ($intents as [$title, $cat, $kw, $ans, $qr]) {
            ChatbotIntent::create(['title' => $title, 'category' => $cat, 'keywords' => $kw, 'answer' => $ans, 'quick_replies' => $qr]);
        }

        // ---------- Blog ----------
        foreach ([
            ['7 Persiapan Penting Sebelum Berangkat Umrah', 'Mulai dari kesehatan, dokumen, hingga ilmu manasik — inilah checklist yang wajib Anda siapkan.'],
            ['Panduan Lengkap Tata Cara Umrah Sesuai Sunnah', 'Ihram, thawaf, sa\'i, hingga tahallul dijelaskan langkah demi langkah.'],
            ['Tips Menabung & Mencicil Biaya Umrah dengan Tenang', 'Rencanakan keuangan ibadah Anda dengan skema cicilan fleksibel tanpa riba.'],
        ] as $i => [$title, $excerpt]) {
            Post::create(['title' => $title, 'slug' => Str::slug($title), 'excerpt' => $excerpt, 'author_id' => $owner->id, 'published_at' => now()->subDays(($i + 1) * 5),
                'content' => "<p>{$excerpt}</p><h3>Niatkan karena Allah</h3><p>Perjalanan umrah adalah perjalanan ibadah. Luruskan niat dan persiapkan diri sebaik-baiknya.</p><h3>Persiapkan dokumen sejak awal</h3><p>Pastikan paspor masih berlaku minimal 8 bulan, dan unggah dokumen Anda melalui dashboard agar dapat segera diverifikasi.</p><h3>Jaga kesehatan</h3><p>Rutin berolahraga ringan seperti berjalan kaki, karena ibadah umrah banyak membutuhkan stamina.</p>"]);
        }
    }
}
