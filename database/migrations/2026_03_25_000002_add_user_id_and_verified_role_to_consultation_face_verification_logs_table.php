<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultation_face_verification_logs', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->after('consultation_id');
            $table->string('verified_role')->nullable()->after('user_id');

            $table->index(['consultation_id', 'user_id'], 'cfvl_cons_user_idx');
            $table->index(['consultation_id', 'verified_role'], 'cfvl_cons_role_idx');
        });
    }

    public function down(): void
    {
        Schema::table('consultation_face_verification_logs', function (Blueprint $table) {
            $table->dropIndex('cfvl_cons_user_idx');
            $table->dropIndex('cfvl_cons_role_idx');
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'verified_role']);
        });
    }
};
