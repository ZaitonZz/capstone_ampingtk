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
        Schema::table('deepfake_escalations', function (Blueprint $table) {
            $table->enum('type', ['admin_alert', 'doctor_decision', 'otp_verification'])
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('deepfake_escalations')
            ->where('type', 'otp_verification')
            ->update(['type' => 'admin_alert']);

        Schema::table('deepfake_escalations', function (Blueprint $table) {
            $table->enum('type', ['admin_alert', 'doctor_decision'])
                ->change();
        });
    }
};
