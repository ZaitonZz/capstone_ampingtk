<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->enum('status', ['pending', 'scheduled', 'ongoing', 'paused', 'completed', 'cancelled', 'no_show'])
                ->default('scheduled')
                ->change();

            $table->string('status_before_pause', 32)->nullable()->after('status');
            $table->foreignId('identity_verification_target_user_id')
                ->nullable()
                ->after('status_before_pause')
                ->constrained('users')
                ->nullOnDelete();
            $table->enum('identity_verification_target_role', ['patient', 'doctor'])
                ->nullable()
                ->after('identity_verification_target_user_id');
            $table->timestamp('identity_verification_started_at')
                ->nullable()
                ->after('identity_verification_target_role');
            $table->timestamp('identity_verification_expires_at')
                ->nullable()
                ->after('identity_verification_started_at');
            $table->unsignedTinyInteger('identity_verification_attempts')
                ->default(0)
                ->after('identity_verification_expires_at');
            $table->timestamp('identity_verification_resend_available_at')
                ->nullable()
                ->after('identity_verification_attempts');

            $table->index(
                'identity_verification_target_user_id',
                'consultations_identity_target_user_idx'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('consultations')
            ->where('status', 'paused')
            ->update(['status' => 'scheduled']);

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropIndex('consultations_identity_target_user_idx');
            $table->dropConstrainedForeignId('identity_verification_target_user_id');
            $table->dropColumn([
                'status_before_pause',
                'identity_verification_target_role',
                'identity_verification_started_at',
                'identity_verification_expires_at',
                'identity_verification_attempts',
                'identity_verification_resend_available_at',
            ]);

            $table->enum('status', ['pending', 'scheduled', 'ongoing', 'completed', 'cancelled', 'no_show'])
                ->default('scheduled')
                ->change();
        });
    }
};
