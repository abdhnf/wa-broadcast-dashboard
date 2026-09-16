<?php

namespace App\Http\Controllers;

use App\Models\WaCampaign;
use App\Models\WaContact;
use App\Models\WaGroup;
use App\Models\WaTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * API data CRM yang dipakai dashboard sisi browser.
 *
 * Kepemilikan data mengikuti `user_id` wa-api, yang diperoleh dengan
 * memverifikasi API key pengguna langsung ke wa-api pada setiap request.
 * Dengan begitu dashboard tidak pernah menerima user_id kiriman klien —
 * klien hanya boleh mengirim API key yang sudah dimilikinya.
 */
class CrmController extends Controller
{
    /** Batas jumlah kiriman ke wa-api, agar klien tak bisa memblokir request kita. */
    private const VERIFY_TIMEOUT = 5;

    /**
     * Verifikasi API key ke wa-api dan kembalikan identitas pemiliknya.
     * Balasan null berarti key tidak sah atau wa-api tidak terjangkau.
     */
    private function resolveUser(Request $request): ?array
    {
        $apiKey = trim((string) $request->header('X-API-Key', ''));
        if ($apiKey === '') {
            return null;
        }

        $base = rtrim((string) (config('services.wa_api.base') ?: ''), '/');
        if ($base === '') {
            return null;
        }

        $ch = curl_init($base . '/auth/me');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::VERIFY_TIMEOUT,
            CURLOPT_CONNECTTIMEOUT => self::VERIFY_TIMEOUT,
            CURLOPT_HTTPHEADER => ['X-API-Key: ' . $apiKey, 'Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status !== 200 || ! is_string($body)) {
            return null;
        }

        $data = json_decode($body, true);
        if (! is_array($data) || empty($data['id'])) {
            return null;
        }

        return [
            'id' => (string) $data['id'],
            'name' => $data['name'] ?? null,
            'role' => $data['role'] ?? 'user',
        ];
    }

    /** Balasan seragam untuk key yang tidak sah / wa-api tidak terjangkau. */
    private function unauthorized()
    {
        return response()->json([
            'error' => 'API key tidak valid atau wa-api tidak dapat dihubungi.',
        ], 401);
    }

    private function authorize(Request $request): ?array
    {
        $user = $this->resolveUser($request);
        if (! $user) {
            return null;
        }

        return $user;
    }

    // ------------------------------------------------------------------ Groups

    public function groups(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        // Backfill segmen yang sudah pernah masuk lewat import lama. Setelah ini,
        // setiap nilai group_name selalu punya entri nyata di wa_groups.
        $this->syncGroupsForNames(
            $user['id'],
            WaContact::where('user_id', $user['id'])
                ->whereNotNull('group_name')
                ->pluck('group_name')
                ->all(),
        );

        $groups = WaGroup::where('user_id', $user['id'])->orderBy('name')->get();

        // Jumlah anggota dihitung sekali untuk semua grup, bukan satu query per baris.
        $counts = WaContact::where('user_id', $user['id'])
            ->whereNotNull('group_name')
            ->selectRaw('group_name, count(*) as total')
            ->groupBy('group_name')
            ->pluck('total', 'group_name');

        return response()->json([
            'groups' => $groups->map(fn (WaGroup $g) => [
                'id' => (string) $g->id,
                'name' => $g->name,
                'description' => $g->description ?? '',
                'count' => (int) ($counts[$g->name] ?? 0),
            ])->values(),
        ]);
    }

    public function storeGroup(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            // `regex:/\S/` menolak nama yang isinya hanya spasi.
            'name' => ['required', 'string', 'max:150', 'regex:/\S/'],
            'description' => ['nullable', 'string', 'max:255'],
        ])->validate();

        $exists = WaGroup::where('user_id', $user['id'])
            ->where('name', $data['name'])
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'Grup dengan nama itu sudah ada.'], 422);
        }

        $group = WaGroup::create([
            'user_id' => $user['id'],
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
        ]);

        return response()->json([
            'group' => [
                'id' => (string) $group->id,
                'name' => $group->name,
                'description' => $group->description ?? '',
                'count' => 0,
            ],
        ], 201);
    }

    public function groupContacts(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $group = WaGroup::where('user_id', $user['id'])->find($id);
        if (! $group) {
            return response()->json(['error' => 'Segmen tidak ditemukan.'], 404);
        }

        $contacts = WaContact::where('user_id', $user['id'])
            ->where('group_name', $group->name)
            ->orderBy('name')
            ->get()
            ->map(fn (WaContact $c) => $this->contactPayload($c))
            ->values();

        return response()->json([
            'group' => [
                'id' => (string) $group->id,
                'name' => $group->name,
            ],
            'contacts' => $contacts,
        ]);
    }

    public function destroyGroup(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $group = WaGroup::where('user_id', $user['id'])->find($id);
        if (! $group) {
            return response()->json(['error' => 'Grup tidak ditemukan.'], 404);
        }

        DB::transaction(function () use ($group, $user) {
            // Jangan sisakan kontak berlabel grup yang sudah dihapus, karena
            // backfill grup akan membuatnya lagi pada pemuatan berikutnya.
            WaContact::where('user_id', $user['id'])
                ->where('group_name', $group->name)
                ->update(['group_name' => null]);
            $group->delete();
        });

        return response()->json(['success' => true]);
    }

    private function contactPayload(WaContact $contact): array
    {
        return [
            'id' => (string) $contact->id,
            'name' => $contact->name,
            'phone' => $contact->phone,
            'group' => $contact->group_name ?? '',
            'tag' => $contact->tag ?? '',
            'custom' => $contact->custom ?? new \stdClass,
        ];
    }

    private function syncGroupsForNames(string $userId, array $names): void
    {
        foreach (array_unique($names) as $name) {
            $name = trim((string) $name);
            if ($name === '') {
                continue;
            }

            WaGroup::firstOrCreate(
                ['user_id' => $userId, 'name' => $name],
                ['description' => 'Dibuat otomatis dari import kontak']
            );
        }
    }

    // ---------------------------------------------------------------- Contacts

    public function contacts(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $contacts = WaContact::where('user_id', $user['id'])->orderBy('name')->get();

        return response()->json([
            'contacts' => $contacts->map(fn (WaContact $c) => [
                'id' => (string) $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'group' => $c->group_name ?? '',
                'tag' => $c->tag ?? '',
                'custom' => $c->custom ?? new \stdClass,
            ])->values(),
        ]);
    }

    public function storeContact(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:150', 'regex:/\S/'],
            'phone' => ['required', 'string', 'max:20'],
            'group' => ['nullable', 'string', 'max:150'],
            'tag' => ['nullable', 'string', 'max:60'],
            'custom' => ['nullable', 'array', 'max:50'],
            'custom.*' => ['nullable', 'string', 'max:500'],
        ])->validate();

        // Aturannya sama dengan resources/js/lib/phone.js dan skema `to` wa-api.
        $phone = $this->normalizePhone($data['phone']);
        if (! preg_match('/^62\d{8,13}$/', $phone)) {
            return response()->json([
                'error' => 'Nomor WhatsApp tidak valid. Gunakan format 628xxxxxxxxx (10-15 angka).',
            ], 422);
        }

        $exists = WaContact::where('user_id', $user['id'])->where('phone', $phone)->exists();
        if ($exists) {
            return response()->json(['error' => 'Nomor itu sudah ada di daftar kontak.'], 422);
        }

        $contact = WaContact::create([
            'user_id' => $user['id'],
            'name' => $data['name'],
            'phone' => $phone,
            'group_name' => $data['group'] ?? null,
            'tag' => $data['tag'] ?? null,
            'custom' => $data['custom'] ?? [],
        ]);

        return response()->json([
            'contact' => [
                'id' => (string) $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'group' => $contact->group_name ?? '',
                'tag' => $contact->tag ?? '',
                'custom' => $contact->custom ?? new \stdClass,
            ],
        ], 201);
    }

    public function batchStoreContacts(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $validator = Validator::make($request->all(), [
            'contacts' => ['required', 'array', 'max:5000'],
            'contacts.*.name' => ['required', 'string', 'max:150'],
            'contacts.*.phone' => ['required', 'string', 'max:30'],
            'contacts.*.group' => ['nullable', 'string', 'max:150'],
            'contacts.*.tag' => ['nullable', 'string', 'max:60'],
            'contacts.*.custom' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $items = $request->input('contacts', []);
        $userId = $user['id'];
        $importedGroupNames = collect($items)
            ->map(fn ($item) => trim((string) ($item['group'] ?? '')))
            ->filter()
            ->all();

        $existingPhones = WaContact::where('user_id', $userId)
            ->pluck('phone')
            ->flip()
            ->all();

        $inserted = [];
        $skipped = 0;
        $seenInBatch = [];

        DB::transaction(function () use ($userId, $importedGroupNames, $items, $existingPhones, &$inserted, &$skipped, &$seenInBatch) {
            // Segmen dari kolom `group` wajib materialize ke tabel wa_groups,
            // termasuk saat semua baris kontak ternyata duplikat.
            $this->syncGroupsForNames($userId, $importedGroupNames);

            foreach ($items as $item) {
                $name = trim($item['name'] ?? '');
                $rawPhone = trim($item['phone'] ?? '');
                $group = ! empty($item['group']) ? trim($item['group']) : null;
                $tag = ! empty($item['tag']) ? trim($item['tag']) : null;
                $custom = is_array($item['custom'] ?? null) ? $item['custom'] : [];

                $phone = $this->normalizePhone($rawPhone);
                if (! preg_match('/^62\d{8,13}$/', $phone) || empty($name)) {
                    $skipped++;
                    continue;
                }

                if (isset($existingPhones[$phone]) || isset($seenInBatch[$phone])) {
                    $skipped++;
                    continue;
                }

                $seenInBatch[$phone] = true;

                $contact = WaContact::create([
                    'user_id' => $userId,
                    'name' => $name,
                    'phone' => $phone,
                    'group_name' => $group,
                    'tag' => $tag,
                    'custom' => $custom,
                ]);

                $inserted[] = $this->contactPayload($contact);
            }
        });

        return response()->json([
            'success' => true,
            'insertedCount' => count($inserted),
            'skippedCount' => $skipped,
            'contacts' => $inserted,
        ]);
    }

    public function updateContact(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $contact = WaContact::where('user_id', $user['id'])->find($id);
        if (! $contact) {
            return response()->json(['error' => 'Kontak tidak ditemukan.'], 404);
        }

        $data = Validator::make($request->all(), [
            'name' => ['sometimes', 'required', 'string', 'max:150', 'regex:/\S/'],
            'phone' => ['sometimes', 'required', 'string', 'max:20'],
            'group' => ['nullable', 'string', 'max:150'],
            'tag' => ['nullable', 'string', 'max:60'],
            'custom' => ['nullable', 'array', 'max:50'],
            'custom.*' => ['nullable', 'string', 'max:500'],
        ])->validate();

        if (isset($data['phone'])) {
            $phone = $this->normalizePhone($data['phone']);
            if (! preg_match('/^62\d{8,13}$/', $phone)) {
                return response()->json([
                    'error' => 'Nomor WhatsApp tidak valid. Gunakan format 628xxxxxxxxx (10-15 angka).',
                ], 422);
            }

            $duplicate = WaContact::where('user_id', $user['id'])
                ->where('phone', $phone)
                ->where('id', '!=', $id)
                ->exists();

            if ($duplicate) {
                return response()->json(['error' => 'Nomor itu sudah digunakan kontak lain.'], 422);
            }

            $contact->phone = $phone;
        }

        if (isset($data['name'])) {
            $contact->name = $data['name'];
        }

        if (array_key_exists('group', $data)) {
            $contact->group_name = $data['group'] ?: null;
        }

        if (array_key_exists('tag', $data)) {
            $contact->tag = $data['tag'] ?: null;
        }

        if (array_key_exists('custom', $data)) {
            $contact->custom = $data['custom'] ?? [];
        }

        $oldPhone = $contact->getOriginal('phone');
        $contact->save();

        // Sinkronkan pembaruan kontak ke seluruh antrean kampanye milik pengguna
        $campaigns = WaCampaign::where('user_id', $user['id'])->get();
        foreach ($campaigns as $camp) {
            $queue = $camp->queue;
            if (! is_array($queue) || empty($queue)) {
                continue;
            }

            $changed = false;
            foreach ($queue as $idx => $item) {
                $itemPhone = $item['phone'] ?? '';
                $itemContactId = isset($item['contactId']) ? (string) $item['contactId'] : null;

                $matches = ($oldPhone && $itemPhone === $oldPhone)
                    || ($itemPhone === $contact->phone)
                    || ($itemContactId && $itemContactId === (string) $contact->id);

                if ($matches) {
                    $queue[$idx]['phone'] = $contact->phone;
                    $queue[$idx]['name'] = $contact->name;
                    $queue[$idx]['contactId'] = (string) $contact->id;
                    if (isset($contact->custom) && is_array($contact->custom)) {
                        $queue[$idx]['custom'] = $contact->custom;
                    }

                    // Jika nomor diperbaiki dan sebelumnya berstatus gagal/invalid,
                    // reset status kontak di antrean menjadi pending agar siap dikirim ulang.
                    $currentStatus = $queue[$idx]['status'] ?? '';
                    if ($oldPhone !== $contact->phone && in_array($currentStatus, ['failed', 'invalid_number', 'not_registered'])) {
                        $queue[$idx]['status'] = 'pending';
                        $queue[$idx]['error'] = null;
                        $queue[$idx]['messageId'] = null;
                        $queue[$idx]['sentAt'] = '-';
                    }

                    $changed = true;
                }
            }

            if ($changed) {
                $hasPending = collect($queue)->contains(fn ($q) => ($q['status'] ?? '') === 'pending');
                $patchData = ['queue' => $queue];
                if ($hasPending && in_array($camp->status, ['completed', 'failed'])) {
                    $patchData['status'] = 'idle';
                }
                $camp->fill($patchData)->save();
            }
        }

        return response()->json([
            'contact' => [
                'id' => (string) $contact->id,
                'name' => $contact->name,
                'phone' => $contact->phone,
                'group' => $contact->group_name ?? '',
                'tag' => $contact->tag ?? '',
                'custom' => $contact->custom ?? new \stdClass,
            ],
        ]);
    }

    public function destroyContact(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $contact = WaContact::where('user_id', $user['id'])->find($id);
        if (! $contact) {
            return response()->json(['error' => 'Kontak tidak ditemukan.'], 404);
        }

        $contact->delete();

        return response()->json(['success' => true]);
    }

    public function bulkUpdateContacts(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            'contactIds' => ['required', 'array', 'min:1', 'max:5000'],
            'contactIds.*' => ['required'],
            'group' => ['nullable', 'string', 'max:150'],
            'groupMode' => ['nullable', 'in:keep,set,clear'],
            'tagMode' => ['nullable', 'in:keep,append,replace,remove'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:60'],
            'custom' => ['nullable', 'array'],
            'customMode' => ['nullable', 'in:merge,replace,clear'],
        ])->validate();

        $userId = $user['id'];
        $ids = $data['contactIds'];
        $groupMode = $data['groupMode'] ?? 'keep';
        $tagMode = $data['tagMode'] ?? 'keep';
        $customMode = $data['customMode'] ?? 'merge';

        if ($groupMode === 'set' && ! empty($data['group'])) {
            $this->syncGroupsForNames($userId, [$data['group']]);
        }

        $updatedCount = 0;

        DB::transaction(function () use ($userId, $ids, $data, $groupMode, $tagMode, $customMode, &$updatedCount) {
            $contacts = WaContact::where('user_id', $userId)->whereIn('id', $ids)->get();

            foreach ($contacts as $contact) {
                $dirty = false;

                // 1. Kelola Segmen / Grup
                if ($groupMode === 'set') {
                    $newGroup = trim($data['group'] ?? '');
                    $contact->group_name = $newGroup !== '' ? $newGroup : null;
                    $dirty = true;
                } elseif ($groupMode === 'clear') {
                    $contact->group_name = null;
                    $dirty = true;
                }

                // 2. Kelola Tag (Multi-Tag didukung via comma-separated string)
                if ($tagMode !== 'keep') {
                    $currentTags = array_filter(array_map('trim', explode(',', $contact->tag ?? '')));
                    $inputTags = array_filter(array_map('trim', $data['tags'] ?? []));

                    if ($tagMode === 'replace') {
                        $currentTags = array_values(array_unique($inputTags));
                    } elseif ($tagMode === 'append') {
                        $currentTags = array_values(array_unique(array_merge($currentTags, $inputTags)));
                    } elseif ($tagMode === 'remove') {
                        $toRemove = array_flip($inputTags);
                        $currentTags = array_values(array_filter($currentTags, fn ($t) => ! isset($toRemove[$t])));
                    }

                    $contact->tag = ! empty($currentTags) ? implode(', ', $currentTags) : null;
                    $dirty = true;
                }

                // 3. Kelola Variabel Kustom
                if ($customMode === 'clear') {
                    $contact->custom = [];
                    $dirty = true;
                } elseif ($customMode === 'replace') {
                    $contact->custom = is_array($data['custom'] ?? null) ? $data['custom'] : [];
                    $dirty = true;
                } elseif ($customMode === 'merge' && ! empty($data['custom']) && is_array($data['custom'])) {
                    $existing = is_array($contact->custom) ? $contact->custom : [];
                    $contact->custom = array_merge($existing, $data['custom']);
                    $dirty = true;
                }

                if ($dirty) {
                    $contact->save();
                    $updatedCount++;
                }
            }
        });

        return response()->json([
            'success' => true,
            'updatedCount' => $updatedCount,
        ]);
    }

    public function bulkDeleteContacts(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            'contactIds' => ['required', 'array', 'min:1', 'max:5000'],
            'contactIds.*' => ['required'],
        ])->validate();

        $deletedCount = WaContact::where('user_id', $user['id'])
            ->whereIn('id', $data['contactIds'])
            ->delete();

        return response()->json([
            'success' => true,
            'deletedCount' => $deletedCount,
        ]);
    }

    // --------------------------------------------------------------- Templates

    public function templates(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $templates = WaTemplate::where('user_id', $user['id'])->orderByDesc('id')->get();

        return response()->json([
            'templates' => $templates->map(fn (WaTemplate $t) => [
                'id' => (string) $t->id,
                'title' => $t->title,
                'messageType' => $t->message_type,
                'mediaType' => $t->media_type,
                'mediaUrl' => $t->media_url,
                'fileName' => $t->file_name,
                'content' => $t->content,
                'location' => $t->location,
            ])->values(),
        ]);
    }

    public function storeTemplate(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:180', 'regex:/\S/'],
            'messageType' => ['required', 'in:text,media,location'],
            'mediaType' => ['nullable', 'in:image,video,audio,document'],
            // URL media wajib http(s) bila diisi, supaya tidak tersimpan teks bebas.
            'mediaUrl' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'fileName' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:20000', 'regex:/\S/'],
            'location' => ['nullable', 'array'],
        ])->validate();

        $template = WaTemplate::create([
            'user_id' => $user['id'],
            'title' => $data['title'],
            'message_type' => $data['messageType'],
            'media_type' => $data['mediaType'] ?? null,
            'media_url' => $data['mediaUrl'] ?? null,
            'file_name' => $data['fileName'] ?? null,
            'content' => $data['content'],
            'location' => $data['location'] ?? null,
        ]);

        return response()->json([
            'template' => [
                'id' => (string) $template->id,
                'title' => $template->title,
                'messageType' => $template->message_type,
                'mediaType' => $template->media_type,
                'mediaUrl' => $template->media_url,
                'fileName' => $template->file_name,
                'content' => $template->content,
                'location' => $template->location,
            ],
        ], 201);
    }

    public function updateTemplate(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $template = WaTemplate::where('user_id', $user['id'])->find($id);
        if (! $template) {
            return response()->json(['error' => 'Template tidak ditemukan.'], 404);
        }

        $data = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:180', 'regex:/\S/'],
            'messageType' => ['required', 'in:text,media,location'],
            'mediaType' => ['nullable', 'in:image,video,audio,document'],
            // URL media wajib http(s) bila diisi, supaya tidak tersimpan teks bebas.
            'mediaUrl' => ['nullable', 'string', 'max:2048', 'url:http,https'],
            'fileName' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:20000', 'regex:/\S/'],
            'location' => ['nullable', 'array'],
        ])->validate();

        $template->update([
            'title' => $data['title'],
            'message_type' => $data['messageType'],
            'media_type' => $data['mediaType'] ?? null,
            'media_url' => $data['mediaUrl'] ?? null,
            'file_name' => $data['fileName'] ?? null,
            'content' => $data['content'],
            'location' => $data['location'] ?? null,
        ]);

        return response()->json([
            'template' => [
                'id' => (string) $template->id,
                'title' => $template->title,
                'messageType' => $template->message_type,
                'mediaType' => $template->media_type,
                'mediaUrl' => $template->media_url,
                'fileName' => $template->file_name,
                'content' => $template->content,
                'location' => $template->location,
            ],
        ]);
    }

    public function destroyTemplate(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $template = WaTemplate::where('user_id', $user['id'])->find($id);
        if (! $template) {
            return response()->json(['error' => 'Template tidak ditemukan.'], 404);
        }

        $template->delete();

        return response()->json(['success' => true]);
    }

    // --------------------------------------------------------------- Campaigns

    /**
     * Bentuk keluaran kampanye yang dipakai daftar maupun detail.
     * Dipusatkan supaya field baru (mis. `queue`) tidak perlu ditambahkan di
     * beberapa tempat dan berisiko tidak konsisten.
     */
    private function serializeCampaign(WaCampaign $c): array
    {
        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'batchId' => $c->batch_id,
            'groupName' => $c->group_name,
            'targetType' => $c->target_type ?? 'group',
            'targetTags' => $c->target_tags ?? [],
            'templateId' => $c->template_id,
            'templateTitle' => $c->template_title,
            'messageSource' => $c->message_source ?? 'template',
            'messageContent' => $c->message_content,
            'totalRecipients' => $c->total_recipients,
            'sentCount' => $c->sent_count,
            'deliveredCount' => $c->delivered_count,
            'readCount' => $c->read_count,
            'failedCount' => $c->failed_count,
            'status' => $c->status,
            'sessionUsed' => $c->session_used,
            'queue' => $c->queue ?? [],
            'createdAt' => $c->created_at ? $c->created_at->timezone('Asia/Jakarta')->format('Y-m-d H:i') . ' WIB' : '-',
        ];
    }

    /**
     * Rapikan nomor ke format 62xxx.
     *
     * Aturannya wajib sama dengan `resources/js/lib/phone.js` di klien dan
     * skema `to` di wa-api; kalau berbeda, nomor yang tersimpan di CRM bisa
     * tertolak backend saat dikirim.
     */
    private function normalizePhone(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value) ?? '';
        $digits = ltrim($digits, '0');

        if ($digits === '') {
            return '';
        }

        return str_starts_with($digits, '62') ? $digits : '62' . $digits;
    }

    public function campaigns(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $campaigns = WaCampaign::where('user_id', $user['id'])->orderByDesc('id')->get();

        return response()->json([
            'campaigns' => $campaigns->map(fn (WaCampaign $c) => $this->serializeCampaign($c))->values(),
        ]);
    }

    public function storeCampaign(Request $request)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $data = Validator::make($request->all(), [
            // `name` wajib berupa huruf/angka, bukan hanya spasi.
            'name' => ['required', 'string', 'max:180', 'regex:/\S/'],
            'batchId' => ['nullable', 'string', 'max:60'],
            'groupName' => ['nullable', 'string', 'max:150'],
            'targetType' => ['nullable', 'string', 'in:group,tag,all'],
            'targetTags' => ['nullable', 'array'],
            'targetTags.*' => ['string', 'max:60'],
            'templateId' => ['nullable', 'string', 'max:64'],
            'templateTitle' => ['nullable', 'string', 'max:180'],
            'messageSource' => ['nullable', 'string', 'in:template,manual'],
            'messageContent' => ['nullable', 'string', 'max:10000'],
            'totalRecipients' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'status' => ['nullable', 'in:idle,in_progress,paused,completed,failed'],
            'sessionUsed' => ['nullable', 'string', 'max:120'],
            'queue' => ['nullable', 'array', 'max:5000'],
            'queue.*.id' => ['nullable', 'string', 'max:120'],
            'queue.*.phone' => ['required_with:queue', 'string'],
            'queue.*.name' => ['nullable', 'string', 'max:150'],
            'queue.*.status' => ['nullable', 'string', 'max:40'],
            'queue.*.custom' => ['nullable'],
            'queue.*.sentAt' => ['nullable', 'string', 'max:50'],
            'queue.*.session' => ['nullable', 'string', 'max:120'],
        ])->validate();

        $campaign = WaCampaign::create([
            'user_id' => $user['id'],
            'name' => trim($data['name']),
            'batch_id' => $data['batchId'] ?? null,
            'group_name' => $data['groupName'] ?? null,
            'target_type' => $data['targetType'] ?? 'group',
            'target_tags' => $data['targetTags'] ?? [],
            'template_id' => $data['templateId'] ?? null,
            'template_title' => $data['templateTitle'] ?? null,
            'message_source' => $data['messageSource'] ?? 'template',
            'message_content' => $data['messageContent'] ?? null,
            'total_recipients' => $data['totalRecipients'] ?? 0,
            'status' => $data['status'] ?? 'idle',
            'session_used' => $data['sessionUsed'] ?? null,
            'queue' => $data['queue'] ?? [],
        ]);

        return response()->json(['campaign' => $this->serializeCampaign($campaign)], 201);
    }

    public function updateCampaign(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $campaign = WaCampaign::where('user_id', $user['id'])->find($id);
        if (! $campaign) {
            return response()->json(['error' => 'Kampanye tidak ditemukan.'], 404);
        }

        $data = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:180', 'regex:/\S/'],
            'status' => ['sometimes', 'in:idle,in_progress,paused,completed,failed'],
            'batchId' => ['sometimes', 'nullable', 'string', 'max:60'],
            'groupName' => ['sometimes', 'nullable', 'string', 'max:150'],
            'targetType' => ['sometimes', 'nullable', 'string', 'in:group,tag,all'],
            'targetTags' => ['sometimes', 'nullable', 'array'],
            'targetTags.*' => ['string', 'max:60'],
            'templateId' => ['sometimes', 'nullable', 'string', 'max:64'],
            'templateTitle' => ['sometimes', 'nullable', 'string', 'max:180'],
            'messageSource' => ['sometimes', 'nullable', 'string', 'in:template,manual'],
            'messageContent' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'totalRecipients' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'sentCount' => ['sometimes', 'integer', 'min:0'],
            'deliveredCount' => ['sometimes', 'integer', 'min:0'],
            'readCount' => ['sometimes', 'integer', 'min:0'],
            'failedCount' => ['sometimes', 'integer', 'min:0'],
            'sessionUsed' => ['sometimes', 'nullable', 'string', 'max:120'],
            // Antrean target ikut disimpan di sini. Tanpa kolom ini, nomor yang
            // sudah ditambahkan pengguna hilang setiap halaman dimuat ulang.
            'queue' => ['sometimes', 'nullable', 'array', 'max:5000'],
            'queue.*.id' => ['nullable', 'string', 'max:120'],
            'queue.*.phone' => ['required_with:queue', 'string', 'regex:/^\d{8,15}$/'],
            'queue.*.name' => ['nullable', 'string', 'max:150'],
            'queue.*.status' => ['nullable', 'string', 'max:40'],
            'queue.*.custom' => ['nullable'],
            'queue.*.sentAt' => ['nullable', 'string', 'max:50'],
            'queue.*.session' => ['nullable', 'string', 'max:120'],
        ])->validate();

        // Hanya field yang benar-benar dikirim yang diubah, supaya pemanggil bisa
        // memperbarui sebagian data (mis. hanya antrean) tanpa menimpa sisanya.
        $patch = [];
        foreach ([
            'name' => 'name',
            'batchId' => 'batch_id',
            'groupName' => 'group_name',
            'targetType' => 'target_type',
            'targetTags' => 'target_tags',
            'templateId' => 'template_id',
            'templateTitle' => 'template_title',
            'messageSource' => 'message_source',
            'messageContent' => 'message_content',
            'totalRecipients' => 'total_recipients',
            'sentCount' => 'sent_count',
            'deliveredCount' => 'delivered_count',
            'readCount' => 'read_count',
            'failedCount' => 'failed_count',
            'status' => 'status',
            'sessionUsed' => 'session_used',
            'queue' => 'queue',
        ] as $input => $column) {
            if (array_key_exists($input, $data)) {
                $patch[$column] = $input === 'name' ? trim($data[$input]) : $data[$input];
            }
        }

        if ($patch !== []) {
            $campaign->fill($patch)->save();
        }

        return response()->json(['campaign' => $this->serializeCampaign($campaign)]);
    }

    public function destroyCampaign(Request $request, string $id)
    {
        if (! $user = $this->authorize($request)) {
            return $this->unauthorized();
        }

        $campaign = WaCampaign::where('user_id', $user['id'])->find($id);
        if (! $campaign) {
            return response()->json(['error' => 'Kampanye tidak ditemukan.'], 404);
        }

        $campaign->delete();

        return response()->json(['success' => true]);
    }
}
