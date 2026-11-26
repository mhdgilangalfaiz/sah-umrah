<table class="head">
    <tr>
        <td><img src="{{ public_path('images/logo-sah.png') }}" class="logo" alt="SAH"></td>
        <td class="company">
            @php($addr = preg_split('/,\s*(?=(?:Kota|Kab\.|Kabupaten)\s)/u', (string) $company['company_address'], 2))
            <b>{{ $company['company_name'] }}</b><br>
            {{ $addr[0] }}@if(isset($addr[1])),@endif<br>
            @if(isset($addr[1])){{ $addr[1] }} · @endif Telp. {{ $company['company_phone'] }}<br>
            {{ $company['company_email'] }}<br>
            {{ $company['license_ppiu'] }}
        </td>
    </tr>
</table>
