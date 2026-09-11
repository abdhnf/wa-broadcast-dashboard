<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Grup audiens. Dipakai sebagai label pengelompokan kontak, bukan penyimpanan anggota:
 * keanggotaan ditentukan oleh wa_contacts.group_name.
 */
class WaGroup extends Model
{
    protected $fillable = ['user_id', 'name', 'description'];

    /** Jumlah kontak yang tergabung, dihitung dari nama grup. */
    public function contactsCount(): int
    {
        return WaContact::where('user_id', $this->user_id)
            ->where('group_name', $this->name)
            ->count();
    }
}
