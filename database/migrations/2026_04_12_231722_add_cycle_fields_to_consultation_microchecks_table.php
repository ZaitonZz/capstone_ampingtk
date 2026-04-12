<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_microchecks', function (Blueprint $table) {
            $table->uuid('cycle_key')->nullable()->after('consultation_id');
            $table->enum('target_role', ['patient', 'doctor'])->nullable()->after('cycle_key');

            $table->index(['consultation_id', 'cycle_key'], 'microchecks_cons_cycle_idx');
            $table->index(
                ['consultation_id', 'target_role', 'status', 'scheduled_at'],
                'microchecks_cons_role_status_sched_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('consultation_microchecks', function (Blueprint $table) {
            $table->dropIndex('microchecks_cons_cycle_idx');
            $table->dropIndex('microchecks_cons_role_status_sched_idx');
            $table->dropColumn(['cycle_key', 'target_role']);
        });
    }
};
