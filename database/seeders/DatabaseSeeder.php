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
        // ---------- Akun admin ----------
        $make = function (string $name, string $email, string $role, bool $primary = false) {
            $u = new User(['name' => $name, 'email' => $email, 'password' => env('SEED_ADMIN_PASSWORD', 'Admin#SAH2026')]);
            $u->forceFill(['role' => $role, 'is_primary_admin' => $primary, 'is_active' => true, 'email_verified_at' => now()])->save();

            return $u;
        };
        $owner = $make('Admin Utama SAH', env('SEED_ADMIN_EMAIL', 'admin@sah.co.id'), 'super_admin', true);
        $make('Finance SAH', 'finance@sah.co.id', 'finance');
        $make('Operasional SAH', 'operasional@sah.co.id', 'operasional');
        $make('CS SAH', 'cs@sah.co.id', 'cs');

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

        // ---------- Paket umrah ----------
        $itin = fn (int $days) => collect([
            ['day' => 1, 'title' => 'Medan (KNO) → Jeddah', 'description' => 'Berkumpul di Bandara Kualanamu, penerbangan menuju Jeddah. Tiba dan transfer ke Madinah.'],
            ['day' => 2, 'title' => 'Madinah — Ziarah Masjid Nabawi', 'description' => 'Sholat berjamaah di Masjid Nabawi, ziarah Raudhah dan makam Rasulullah ﷺ.'],
            ['day' => 3, 'title' => 'City Tour Madinah', 'description' => 'Masjid Quba, Jabal Uhud, Kebun Kurma, Masjid Qiblatain.'],
            ['day' => 4, 'title' => 'Madinah → Makkah (Miqat Bir Ali)', 'description' => 'Mengambil miqat di Bir Ali, perjalanan ke Makkah, pelaksanaan umrah pertama.'],
            ['day' => 5, 'title' => 'Ibadah di Masjidil Haram', 'description' => 'Memperbanyak ibadah di Masjidil Haram.'],
            ['day' => 6, 'title' => 'City Tour Makkah', 'description' => 'Jabal Tsur, Jabal Rahmah, Arafah, Muzdalifah, Mina. Miqat Ji\'ranah untuk umrah kedua.'],
            ['day' => $days - 1, 'title' => 'Thawaf Wada\'', 'description' => 'Thawaf perpisahan dan persiapan kepulangan.'],
            ['day' => $days, 'title' => 'Jeddah → Medan', 'description' => 'Penerbangan kembali ke tanah air. Tiba di Kualanamu, alhamdulillah.'],
        ])->unique('day')->sortBy('day')->values()->all();

        $facilities = ['Tiket pesawat PP kelas ekonomi', 'Visa umrah', 'Hotel sesuai paket', 'Makan 3x sehari menu Indonesia', 'Muthawwif & tour leader berpengalaman',
            'Manasik umrah 2x', 'Air zam-zam 5 liter', 'Perlengkapan umrah (koper, ihram/mukena, buku doa)', 'Asuransi perjalanan', 'Bus AC eksklusif'];
        $docs = ['Paspor berlaku minimal 8 bulan', 'Pas foto 4x6 latar putih (80% wajah)', 'Fotokopi KTP & Kartu Keluarga', 'Buku nikah (suami-istri)', 'Akta lahir (anak)', 'Sertifikat vaksin meningitis'];

        $packages = [
            ['Umrah Reguler Barokah 9 Hari', 'reguler', 9, 'Saudia Airlines', 'Hilton Suites Makkah', 5, '150 m', 'Pullman Zamzam Madinah', 5, '100 m', 32500000, 30500000, 28900000, true],
            ['Umrah Hemat Ramadhan 12 Hari', 'hemat', 12, 'Lion Air', 'Elaf Ajyad Makkah', 4, '400 m', 'Al Haram Hotel Madinah', 4, '200 m', 27900000, 26500000, 25500000, true],
            ['Umrah Plus Turki 15 Hari', 'plus', 15, 'Turkish Airlines', 'Swissotel Al Maqam', 5, '50 m', 'Dar Al Taqwa Madinah', 5, '50 m', 45900000, 43500000, 41900000, true],
            ['Umrah VIP Haramain 12 Hari', 'vip', 12, 'Garuda Indonesia', 'Raffles Makkah Palace', 5, '30 m', 'The Oberoi Madinah', 5, '30 m', 59900000, 56900000, 54500000, false],
        ];
        foreach ($packages as $i => [$name, $type, $days, $air, $hm, $hms, $hmd, $hmad, $hmas, $hmadd, $pq, $pt, $pd, $feat]) {
            $p = Package::create([
                'name' => $name, 'slug' => Str::slug($name), 'type' => $type, 'duration_days' => $days, 'airline' => $air,
                'departure_city' => 'Medan (KNO)', 'hotel_makkah' => $hm, 'hotel_makkah_star' => $hms, 'hotel_makkah_distance' => $hmd,
                'hotel_madinah' => $hmad, 'hotel_madinah_star' => $hmas, 'hotel_madinah_distance' => $hmadd,
                'price_quad' => $pq, 'price_triple' => $pt, 'price_double' => $pd, 'min_deposit' => 3000000,
                'summary' => "Paket {$days} hari bersama {$air}, menginap di {$hm} ({$hmd} dari Masjidil Haram).",
                'description' => 'Perjalanan ibadah umrah yang nyaman dan khusyuk, dibimbing muthawwif bersertifikat dan didampingi tour leader dari Medan. Seluruh transaksi tercatat aman di sistem kami.',
                'itinerary' => $itin($days), 'facilities' => $facilities, 'excludes' => ['Pembuatan paspor', 'Kelebihan bagasi', 'Pengeluaran pribadi', 'Vaksin meningitis'],
                'document_requirements' => $docs, 'is_featured' => $feat, 'is_active' => true,
            ]);
            foreach ([45 + $i * 10, 80 + $i * 12, 130 + $i * 15] as $offset) {
                $dep = now()->addDays($offset)->startOfDay();
                $p->departures()->create(['departure_date' => $dep, 'return_date' => $dep->copy()->addDays($days - 1), 'quota' => 45, 'booked' => rand(5, 25)]);
            }
        }

        // ---------- Jadwal penerbangan (dikelola admin) ----------
        $routes = [
            ['KNO', 'Medan', 'JED', 'Jeddah', 'Saudia Airlines', 'SV', 'SV 5121', 9 * 60 + 40, 0, null, 9850000],
            ['KNO', 'Medan', 'MED', 'Madinah', 'Garuda Indonesia', 'GA', 'GA 980', 10 * 60 + 15, 0, null, 11250000],
            ['KNO', 'Medan', 'JED', 'Jeddah', 'Emirates', 'EK', 'EK 349', 14 * 60 + 30, 1, 'Transit Dubai (DXB) 3j 20m', 8750000],
            ['CGK', 'Jakarta', 'JED', 'Jeddah', 'Saudia Airlines', 'SV', 'SV 817', 9 * 60 + 25, 0, null, 9250000],
            ['JED', 'Jeddah', 'KNO', 'Medan', 'Saudia Airlines', 'SV', 'SV 5122', 9 * 60 + 5, 0, null, 9650000],
            ['MED', 'Madinah', 'KNO', 'Medan', 'Garuda Indonesia', 'GA', 'GA 981', 9 * 60 + 50, 0, null, 10950000],
        ];
        foreach ([7, 14, 21, 35, 50] as $d) {
            foreach ($routes as [$o, $oc, $t, $tc, $air, $code, $no, $dur, $tr, $tinfo, $price]) {
                $dep = now()->addDays($d + rand(0, 3))->setTime(rand(6, 22), [0, 15, 30, 45][rand(0, 3)]);
                Flight::create([
                    'airline' => $air, 'airline_code' => $code, 'flight_number' => $no, 'origin_code' => $o, 'origin_city' => $oc,
                    'destination_code' => $t, 'destination_city' => $tc, 'depart_at' => $dep, 'arrive_at' => $dep->copy()->addMinutes($dur),
                    'transit_count' => $tr, 'transit_info' => $tinfo, 'cabin_class' => 'ekonomi', 'price' => $price + rand(-5, 8) * 100000,
                    'baggage_kg' => 30, 'cabin_baggage_kg' => 7, 'seats_available' => rand(8, 40),
                    'refund_policy' => 'Refund dikenakan potongan 25% dari harga tiket bila diajukan ≥ 14 hari sebelum keberangkatan; kurang dari itu tidak dapat direfund (sesuai kebijakan maskapai).',
                    'reschedule_policy' => 'Reschedule maksimal 1x, paling lambat 7 hari sebelum keberangkatan, dikenakan biaya Rp750.000 + selisih harga.',
                ]);
            }
        }

        // ---------- Layanan visa ----------
        VisaService::create([
            'name' => 'Visa Umrah', 'price' => 2750000, 'processing_days' => 7,
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
            ['Bagaimana cara konsultasi?', 'Gunakan Pusat Bantuan (ikon chat di pojok kanan bawah). Asisten otomatis akan menjawab, dan Anda dapat dihubungkan langsung dengan admin kapan saja.'],
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
