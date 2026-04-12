<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deepfake_scan_logs', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->after('consultation_id');
            $table->string('verified_role')->nullable()->after('user_id');
            $table->foreignId('microcheck_id')->nullable()->constrained('consultation_microchecks')->nullOnDelete()->after('consultation_id');

            $table->index(['consultation_id', 'user_id'], 'dsl_cons_user_idx');
            $table->index(['consultation_id', 'verified_role'], 'dsl_cons_role_idx');
            $table->index(['consultation_id', 'microcheck_id'], 'dsl_cons_microcheck_idx');
        });
    }

    public function down(): void
    {
        Schema::table('deepfake_scan_logs', function (Blueprint $table) {
            $table->dropIndex('dsl_cons_user_idx');
            $table->dropIndex('dsl_cons_role_idx');
            $table->dropIndex('dsl_cons_microcheck_idx');
            $table->dropForeign(['user_id']);
            $table->dropForeign(['microcheck_id']);
            $table->dropColumn(['user_id', 'verified_role', 'microcheck_id']);
        });
    }
};
