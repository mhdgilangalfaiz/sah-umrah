<table class="head">
    <tr>
        <td><img src="{{ public_path('images/logo-sah.png') }}" class="logo" alt="SAH"></td>
        <td class="company">
            <b>{{ $company['company_name'] }}</b><br>
            {{ $company['company_address'] }}<br>
            Telp. {{ $company['company_phone'] }} · {{ $company['company_email'] }}<br>
            {{ $company['license_ppiu'] }}
        </td>
    </tr>
</table>
