<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_face_verification_logs', function (Blueprint $table) {
            $table->foreignId('microcheck_id')
                ->nullable()
                ->after('consultation_id')
                ->constrained('consultation_microchecks')
                ->nullOnDelete();

            $table->index(['consultation_id', 'verified_role', 'microcheck_id'], 'cfvl_cons_role_microcheck_idx');
            $table->unique(['consultation_id', 'microcheck_id', 'verified_role'], 'cfvl_cons_microcheck_role_unique');
        });
    }

    public function down(): void
    {
        Schema::table('consultation_face_verification_logs', function (Blueprint $table) {
            $table->dropUnique('cfvl_cons_microcheck_role_unique');
            $table->dropIndex('cfvl_cons_role_microcheck_idx');
            $table->dropForeign(['microcheck_id']);
            $table->dropColumn('microcheck_id');
        });
    }
};
