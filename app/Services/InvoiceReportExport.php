<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\FlightOrder;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\VisaApplication;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Rekap Laporan Invoice (Excel & PDF): satu baris per pesanan = invoice terbaru, urut No. Invoice.
 * Kolom: INV NO · PEMBELI · KEBERANGKATAN · QTY · HARGA SATUAN · TOTAL · TANGGAL INVOICE · TANGGAL LUNAS.
 */
class InvoiceReportExport
{
    public const HEADINGS = ['INV NO', 'PEMBELI', 'KEBERANGKATAN', 'QTY', 'HARGA SATUAN', 'TOTAL', 'TANGGAL INVOICE', 'TANGGAL LUNAS'];
    private const GREEN = '0B5D3B';

    /** @param Collection<int, Invoice> $invoices (sudah urut No. Invoice, relasi invoiceable & user dimuat) */
    public function rows(Collection $invoices): array
    {
        $paidOff = $this->paidOffDates($invoices);

        return $invoices->map(function (Invoice $i) use ($paidOff) {
            $o = $i->invoiceable;
            [$buyer, $depart, $qty, $rate] = match (true) {
                $o instanceof Booking => [$i->user?->name, $o->departure?->departure_date, (int) $o->pax_count, (int) $o->unit_price],
                $o instanceof FlightOrder => [$o->bill_company ?: ($o->bill_name ?: $i->user?->name), $o->flight?->depart_at, (int) $o->pax_count, (int) $o->unit_price],
                $o instanceof VisaApplication => [$i->user?->name, $o->planned_departure, (int) $o->pax_count, (int) $o->unit_price],
                default => [$i->user?->name, null, 0, 0],
            };
            $lunas = $o && (int) $o->paid_amount > 0 && $o->outstandingAmount() <= 0 ? ($paidOff[$i->invoiceable_type.'#'.$i->invoiceable_id] ?? null) : null;

            return [
                'number' => $i->number,
                'buyer' => mb_strtoupper((string) $buyer),
                'departure' => $depart?->translatedFormat('d M Y') ?? '-',
                'qty' => $qty,
                'rate' => $rate,
                // total tagihan invoice (jumlah beli × harga satuan, termasuk biaya/potongan revisi bila ada)
                'total' => (int) $i->amount,
                'issued' => $i->issued_at?->translatedFormat('d F Y') ?? '-',
                'paid_off' => $lunas ? \Carbon\Carbon::parse($lunas)->translatedFormat('d F Y') : '-',
            ];
        })->values()->all();
    }

    /** Tanggal pembayaran terakhir (yang membuat lunas) per pesanan — satu query per jenis layanan */
    private function paidOffDates(Collection $invoices): array
    {
        $out = [];
        foreach ($invoices->groupBy('invoiceable_type') as $type => $rows) {
            Payment::where('status', 'dibayar')->where('payable_type', $type)->whereIn('payable_id', $rows->pluck('invoiceable_id'))
                ->selectRaw('payable_id, MAX(paid_at) as last_paid')->groupBy('payable_id')->get()
                ->each(function ($p) use (&$out, $type) { $out[$type.'#'.$p->payable_id] = $p->last_paid; });
        }

        return $out;
    }

    /** File Excel sementara; header hijau, garis tabel, kolom rupiah rata kanan (Rp di kiri) */
    public function excel(array $rows, string $title, string $subtitle): string
    {
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet()->setTitle('Laporan Invoice');
        $last = 'H';

        $sheet->setCellValue('A1', $title)->mergeCells("A1:{$last}1");
        $sheet->setCellValue('A2', $subtitle)->mergeCells("A2:{$last}2");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB(self::GREEN);
        $sheet->getStyle('A2')->getFont()->setItalic(true)->getColor()->setRGB('555555');

        $head = 4;
        foreach (self::HEADINGS as $i => $h) {
            $sheet->setCellValue(chr(65 + $i).$head, $h);
        }
        $sheet->getStyle("A{$head}:{$last}{$head}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::GREEN]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($head)->setRowHeight(22);

        $r = $head;
        foreach ($rows as $row) {
            $r++;
            $sheet->fromArray([$row['number'], $row['buyer'], $row['departure'], $row['qty'].' PAX', $row['rate'], $row['total'], $row['issued'], $row['paid_off']], null, "A{$r}");
        }
        $first = $head + 1;
        $end = max($r, $head);
        $totalRow = $end + 1;
        $sheet->setCellValue("E{$totalRow}", 'TOTAL :');
        $sheet->setCellValue("F{$totalRow}", $rows ? "=SUM(F{$first}:F{$end})" : 0);
        $sheet->getStyle("E{$totalRow}:F{$totalRow}")->getFont()->setBold(true);
        $sheet->getStyle("E{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        $money = '_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"_);_(@_)';
        $sheet->getStyle("E{$first}:F{$totalRow}")->getNumberFormat()->setFormatCode($money);
        foreach (['A', 'C', 'D', 'G', 'H'] as $c) {
            $sheet->getStyle("{$c}{$first}:{$c}{$end}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }
        $sheet->getStyle("A{$head}:{$last}{$end}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        foreach (['A' => 24, 'B' => 30, 'C' => 16, 'D' => 10, 'E' => 18, 'F' => 20, 'G' => 20, 'H' => 20] as $c => $w) {
            $sheet->getColumnDimension($c)->setWidth($w);
        }
        $sheet->freezePane('A'.$first);

        $path = tempnam(sys_get_temp_dir(), 'invrep').'.xlsx';
        (new Xlsx($book))->save($path);

        return $path;
    }
}
