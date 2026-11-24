<?php

namespace App\Services\Flights;

use App\Models\FlightOrder;
use App\Models\User;
use App\Services\FileStorage;
use App\Support\AdminNotifier;
use App\Support\Audit;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Manifest penumpang pesanan tiket (diisi sendiri oleh agen/pembeli dalam Excel, diunggah setelah lunas).
 *
 * File asli selalu disimpan apa adanya (agen boleh memakai format Excel sendiri). Sistem mencoba membaca
 * kolom-kolomnya (nama, paspor, masa berlaku, dll — dikenali dari judul kolom) supaya admin bisa langsung melihat
 * daftar penumpang; kekurangan data hanya ditampilkan sebagai peringatan, tidak menolak unggahan.
 */
class FlightManifest
{
    public const MAX_ROWS = 1000;

    /** Kolom template: [judul, lebar] */
    private const TEMPLATE_COLUMNS = [
        ['No', 5], ['Sapaan (Tn/Ny/Nn/An/Inf)', 14], ['Nama Lengkap (sesuai paspor)', 34], ['Jenis Kelamin (L/P)', 12],
        ['Tanggal Lahir (DD/MM/YYYY)', 16], ['Nomor Paspor', 16], ['Masa Berlaku Paspor (DD/MM/YYYY)', 18],
        ['Kewarganegaraan', 16], ['NIK (opsional)', 20], ['Keterangan', 24],
    ];

    /** Template Excel berisi baris bernomor sebanyak seat yang dipesan */
    public function template(FlightOrder $order): string
    {
        $order->loadMissing('flight');
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('Manifest');
        $f = $order->flightDetails();

        $sheet->setCellValue('A1', 'MANIFEST PENUMPANG — '.$order->code);
        $sheet->setCellValue('A2', trim(($f['airline'] ?? '').' '.($f['flight_number'] ?? '').' · '.($f['route'] ?? '').' · '.($f['depart'] ?? '')).' · '.$order->pax_count.' seat'
            .($order->bill_company ? ' · '.$order->bill_company : ''));
        $sheet->setCellValue('A3', 'Isi data sesuai paspor (huruf kapital). Format tanggal DD/MM/YYYY. Masa berlaku paspor minimal 6 bulan dari tanggal keberangkatan.');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A3')->getFont()->setItalic(true)->getColor()->setRGB('92400E');

        $headerRow = 5;
        foreach (self::TEMPLATE_COLUMNS as $i => [$title, $width]) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue($col.$headerRow, $title);
            $sheet->getColumnDimension($col)->setWidth($width);
        }
        $last = Coordinate::stringFromColumnIndex(count(self::TEMPLATE_COLUMNS));
        $head = $sheet->getStyle("A{$headerRow}:{$last}{$headerRow}");
        $head->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $head->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0F5132');
        $head->getAlignment()->setWrapText(true)->setVertical('center');
        $sheet->getRowDimension($headerRow)->setRowHeight(32);

        $first = $headerRow + 1;
        $end = $headerRow + max(1, $order->pax_count);
        for ($r = $first; $r <= $end; $r++) {
            $sheet->setCellValue('A'.$r, $r - $headerRow);
            $sheet->setCellValue('H'.$r, 'Indonesia');
        }
        // tanggal sebagai tanggal, nomor paspor & NIK sebagai teks (NIK 16 digit tidak berubah jadi 1,23E+15)
        $sheet->getStyle("E{$first}:E{$end}")->getNumberFormat()->setFormatCode('dd/mm/yyyy');
        $sheet->getStyle("G{$first}:G{$end}")->getNumberFormat()->setFormatCode('dd/mm/yyyy');
        $sheet->getStyle("F{$first}:F{$end}")->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);
        $sheet->getStyle("I{$first}:I{$end}")->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);
        $sheet->getStyle("A{$headerRow}:{$last}{$end}")->getBorders()->getAllBorders()->setBorderStyle('thin');
        $sheet->freezePane('A'.$first);

        $path = tempnam(sys_get_temp_dir(), 'manifest').'.xlsx';
        (new Xlsx($book))->save($path);

        return $path;
    }

    /**
     * Simpan file manifest + baca daftar penumpang. Mengganti manifest sebelumnya.
     *
     * @return array{count:int, warnings:string[]}
     */
    public function store(FlightOrder $order, UploadedFile $file, User $by): array
    {
        $rows = $this->read($file);
        $order->loadMissing('flight');
        $warnings = $this->warnings($order, $rows);

        DB::transaction(function () use ($order, $file, $by, $rows, $warnings) {
            $order->passengers()->delete();
            foreach ($rows as $row) {
                $order->passengers()->create($row);
            }
            FileStorage::storeDocument($file, $order->user, 'manifest', [
                'documentable_type' => $order->getMorphClass(), 'documentable_id' => $order->id,
            ], $by);
            $order->update(['manifest_uploaded_at' => now(), 'manifest_warnings' => $warnings ?: null]);
            Audit::log('tiket.manifest', "Manifest {$order->code} diunggah: ".count($rows)." penumpang", $order);
        });

        AdminNotifier::notify('pesanan', 'Manifest diunggah '.$order->code,
            count($rows).' penumpang / '.$order->pax_count.' seat'.($warnings ? ' — '.count($warnings).' catatan' : ''),
            route('admin.flight-orders.show', $order));

        return ['count' => count($rows), 'warnings' => $warnings];
    }

    /** Baca baris penumpang dari Excel/CSV. Judul kolom dicari otomatis di 15 baris pertama. */
    public function read(UploadedFile $file): array
    {
        try {
            $sheet = IOFactory::load($file->getRealPath())->getActiveSheet();
        } catch (\Throwable) {
            throw ValidationException::withMessages(['file' => 'File tidak dapat dibaca. Pastikan formatnya Excel (.xlsx/.xls) atau CSV.']);
        }

        $highestCol = min(Coordinate::columnIndexFromString($sheet->getHighestDataColumn()), 40);
        $highestRow = min($sheet->getHighestDataRow(), self::MAX_ROWS + 20);

        [$headerRow, $map] = [null, []];
        for ($r = 1; $r <= min(15, $highestRow); $r++) {
            $candidate = $this->mapHeader($sheet, $r, $highestCol);
            if (isset($candidate['full_name'])) {
                [$headerRow, $map] = [$r, $candidate];
                break;
            }
        }
        if (! $headerRow) {
            throw ValidationException::withMessages(['file' => 'Kolom "Nama" tidak ditemukan. Gunakan template manifest atau beri judul kolom seperti "Nama Lengkap", "Nomor Paspor", "Masa Berlaku Paspor".']);
        }

        $rows = [];
        for ($r = $headerRow + 1; $r <= $highestRow; $r++) {
            $get = fn (string $key) => isset($map[$key]) ? $sheet->getCell($map[$key].$r)->getValue() : null;
            $name = Str::of((string) $get('full_name'))->squish()->upper()->limit(150, '')->toString();
            if ($name === '' || is_numeric($name)) continue;
            if (count($rows) >= self::MAX_ROWS) break;

            $title = Str::of((string) $get('title'))->squish()->limit(10, '')->toString() ?: null;
            $rows[] = [
                'title' => $title,
                'full_name' => $name,
                'gender' => $this->gender($get('gender'), $title),
                'birth_date' => $this->date($get('birth_date')),
                'passport_number' => Str::of($this->text($get('passport_number')))->upper()->replaceMatches('/\s+/', '')->limit(20, '')->toString() ?: null,
                'passport_expiry' => $this->date($get('passport_expiry')),
                'nationality' => Str::of((string) $get('nationality'))->squish()->title()->limit(30, '')->toString() ?: 'Indonesia',
                'nik' => preg_replace('/\D/', '', $this->text($get('nik'))) ?: null,
            ];
        }
        if (! $rows) {
            throw ValidationException::withMessages(['file' => 'Belum ada data penumpang di file manifest (kolom nama masih kosong).']);
        }

        return $rows;
    }

    /** Kenali kolom dari judulnya → [field => huruf kolom] */
    private function mapHeader($sheet, int $row, int $highestCol): array
    {
        $map = [];
        for ($c = 1; $c <= $highestCol; $c++) {
            $col = Coordinate::stringFromColumnIndex($c);
            $h = Str::of((string) $sheet->getCell($col.$row)->getValue())->lower()->squish()->toString();
            if ($h === '') continue;
            $has = fn (array $words) => Str::contains($h, $words);

            $field = match (true) {
                $has(['berlaku', 'expir', 'exp.', 'exp ', 'habis']) || $h === 'exp' => 'passport_expiry',
                $has(['terbit', 'issue', 'tempat', 'place']) => null,
                $has(['lahir', 'birth', 'dob']) => 'birth_date',
                $has(['nama', 'name']) => 'full_name',
                $has(['paspor', 'passport', 'pasport', 'pspt']) => 'passport_number',
                $has(['nik', 'ktp']) => 'nik',
                $has(['kelamin', 'gender', 'sex', 'l/p']) || $h === 'jk' => 'gender',
                $has(['sapaan', 'title', 'titel', 'gelar']) => 'title',
                $has(['warga', 'nationality', 'negara']) => 'nationality',
                default => null,
            };
            if ($field && ! isset($map[$field])) $map[$field] = $col;
        }

        return $map;
    }

    private function text($v): string
    {
        if (is_float($v) || is_int($v)) return sprintf('%.0f', $v);

        return trim((string) $v);
    }

    private function gender($v, ?string $title): ?string
    {
        $v = Str::lower(trim((string) $v));
        if ($v !== '') {
            if (Str::startsWith($v, ['l', 'm', 'pria'])) return 'L';
            if (Str::startsWith($v, ['p', 'f', 'w'])) return 'P';
        }
        $t = Str::lower((string) $title);
        if (Str::startsWith($t, ['tn', 'mr', 'bapak', 'mstr'])) return 'L';
        if (Str::startsWith($t, ['ny', 'nn', 'mrs', 'ms', 'miss', 'ibu'])) return 'P';

        return null;
    }

    private function date($v): ?string
    {
        if ($v === null || $v === '') return null;
        try {
            if ($v instanceof \DateTimeInterface) return Carbon::instance($v)->toDateString();
            if (is_numeric($v) && $v > 1000 && $v < 80000) return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $v))->toDateString();
            $s = trim((string) $v);
            foreach (['d/m/Y', 'd-m-Y', 'd.m.Y', 'Y-m-d', 'd/m/y', 'd-m-y', 'd M Y', 'd F Y', 'd-M-Y', 'dMY', 'dMy'] as $fmt) {
                $d = \DateTime::createFromFormat('!'.$fmt, $s);
                if ($d && $d->format($fmt) === $s) return Carbon::instance($d)->toDateString();
            }

            return Carbon::parse($s)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /** Catatan pemeriksaan manifest (tidak menolak unggahan) */
    private function warnings(FlightOrder $order, array $rows): array
    {
        $w = [];
        $n = count($rows);
        if ($n !== $order->pax_count) {
            $w[] = "Jumlah penumpang di manifest {$n} orang, sedangkan seat yang dibeli {$order->pax_count} seat.";
        }
        $limit = $order->flight?->depart_at?->copy()->addMonths(6);
        $missing = ['passport_number' => [], 'passport_expiry' => [], 'birth_date' => [], 'expiring' => []];
        foreach ($rows as $i => $r) {
            $label = ($i + 1).'. '.$r['full_name'];
            foreach (['passport_number', 'passport_expiry', 'birth_date'] as $k) {
                if (! $r[$k]) $missing[$k][] = $label;
            }
            if ($limit && $r['passport_expiry'] && Carbon::parse($r['passport_expiry'])->lt($limit)) $missing['expiring'][] = $label;
        }
        $names = fn (array $list) => implode(', ', array_slice($list, 0, 5)).(count($list) > 5 ? ' dan '.(count($list) - 5).' lainnya' : '');
        if ($missing['passport_number']) $w[] = 'Nomor paspor kosong: '.$names($missing['passport_number']).'.';
        if ($missing['passport_expiry']) $w[] = 'Masa berlaku paspor kosong/tidak terbaca: '.$names($missing['passport_expiry']).'.';
        if ($missing['birth_date']) $w[] = 'Tanggal lahir kosong/tidak terbaca: '.$names($missing['birth_date']).'.';
        if ($missing['expiring']) $w[] = 'Paspor berlaku kurang dari 6 bulan dari keberangkatan: '.$names($missing['expiring']).'.';

        return $w;
    }
}
