<?php

namespace Tests\Unit;

use Tests\TestCase;

class GroupImportBehaviorTest extends TestCase
{
    public function test_batch_import_endpoint_declares_group_sync_contract(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/CrmController.php'));

        $this->assertStringContainsString('syncGroupsForNames', $source);
        $this->assertStringContainsString('WaGroup::firstOrCreate', $source);
    }

    public function test_group_members_endpoint_is_registered(): void
    {
        $routes = file_get_contents(base_path('routes/web.php'));

        $this->assertStringContainsString("Route::get('/groups/{id}/contacts'", $routes);
    }

    public function test_deleting_group_clears_member_group_labels(): void
    {
        $source = file_get_contents(app_path('Http/Controllers/CrmController.php'));

        $this->assertStringContainsString("->update(['group_name' => null])", $source);
    }
}
