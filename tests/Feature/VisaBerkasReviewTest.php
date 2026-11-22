<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VisaApplication;
use App\Models\VisaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;
use ZipArchive;

/** Pemeriksaan berkas visa per dokumen: isi ZIP terbaca, dokumen salah dikembalikan ke pelanggan, semua sesuai → Diverifikasi. */
class VisaBerkasReviewTest extends TestCase
{
    use RefreshDatabase;

    private function zip(): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'zip').'.zip';
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE);
        $zip->addFromString('budi/paspor.jpg', 'gambar-paspor');
        $zip->addFromString('budi/ktp.pdf', '%PDF-1.4 ktp');
        $zip->addFromString('__MACOSX/._paspor.jpg', 'x');
        $zip->close();

        return new UploadedFile($path, 'berkas.zip', 'application/zip', null, true);
    }

    public function test_admin_reviews_each_document_in_zip(): void
    {
        $customer = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $service = VisaService::create(['name' => 'Visa Umrah', 'price' => 2_000_000, 'processing_days' => 7, 'is_active' => true]);
        $visa = VisaApplication::create(['code' => 'SAH-V-TEST1', 'user_id' => $customer->id, 'visa_service_id' => $service->id, 'pax_count' => 1,
            'status' => 'menunggu_dokumen', 'unit_price' => 2_000_000, 'total_amount' => 2_000_000, 'paid_amount' => 2_000_000]);

        $this->actingAs($customer)->post(route('customer.visa.upload', $visa), ['file' => $this->zip()])->assertSessionHasNoErrors();
        $doc = $visa->documents()->first();

        // isi ZIP tampil per file (folder sistem dilewati) dan bisa dibuka satu per satu
        $this->actingAs($admin)->get(route('admin.visa.show', $visa))->assertInertia(fn ($p) => $p
            ->where('documents.0.entries.0.name', 'budi/ktp.pdf')->where('documents.0.entries.1.name', 'budi/paspor.jpg')->has('documents.0.entries', 2));
        $this->get(route('admin.visa.berkas.file', [$visa, $doc]).'?nama='.urlencode('budi/paspor.jpg'))
            ->assertOk()->assertHeader('content-type', 'image/jpeg');
        $this->assertSame('gambar-paspor', $this->get(route('admin.visa.berkas.file', [$visa, $doc]).'?nama='.urlencode('budi/paspor.jpg'))->getContent());

        // status "Diverifikasi" tidak bisa dipilih manual sebelum berkas diperiksa
        $this->post(route('admin.visa.status', $visa), ['status' => 'diverifikasi'])->assertSessionHasErrors('status');

        // dokumen tidak sesuai wajib diberi alasan
        $this->post(route('admin.visa.berkas.review', [$visa, $doc]), ['items' => [
            ['name' => 'budi/ktp.pdf', 'ok' => true], ['name' => 'budi/paspor.jpg', 'ok' => false, 'note' => ''],
        ]])->assertSessionHasErrors('items');

        $this->post(route('admin.visa.berkas.review', [$visa, $doc]), ['items' => [
            ['name' => 'budi/ktp.pdf', 'ok' => true], ['name' => 'budi/paspor.jpg', 'ok' => false, 'note' => 'Foto buram'],
        ]])->assertSessionHasNoErrors();
        $doc->refresh();
        $this->assertSame('ditolak', $doc->status);
        $this->assertStringContainsString('paspor.jpg: Foto buram', $doc->rejection_note);
        $this->assertSame('menunggu_dokumen', $visa->fresh()->status);
        $this->assertStringContainsString('Foto buram', $customer->notifications()->latest()->first()->data['message']);

        // pelanggan unggah ulang → semua sesuai → Diverifikasi
        $this->actingAs($customer)->post(route('customer.visa.upload', $visa), ['file' => $this->zip()])->assertSessionHasNoErrors();
        $doc2 = $visa->documents()->where('status', 'menunggu')->first();
        $this->actingAs($admin)->post(route('admin.visa.berkas.review', [$visa, $doc2]), ['items' => [
            ['name' => 'budi/ktp.pdf', 'ok' => true], ['name' => 'budi/paspor.jpg', 'ok' => true],
        ]])->assertSessionHasNoErrors();
        $this->assertSame('diverifikasi', $visa->fresh()->status);
        $this->assertSame('diverifikasi', $doc2->fresh()->status);

        // lanjut sesuai urutan
        $this->post(route('admin.visa.status', $visa), ['status' => 'terbit', 'visa_file' => UploadedFile::fake()->create('visa.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors('status'); // belum diproses → belum boleh terbit
        $this->post(route('admin.visa.status', $visa), ['status' => 'diproses'])->assertSessionHasNoErrors();
        $this->assertSame('diproses', $visa->fresh()->status);
    }
}
