<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->timestamp('livekit_doctor_joined_at')->nullable()->after('livekit_last_activity_at');
            $table->timestamp('livekit_patient_joined_at')->nullable()->after('livekit_doctor_joined_at');
            $table->timestamp('livekit_doctor_left_at')->nullable()->after('livekit_patient_joined_at');
            $table->timestamp('livekit_patient_left_at')->nullable()->after('livekit_doctor_left_at');
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn([
                'livekit_doctor_joined_at',
                'livekit_patient_joined_at',
                'livekit_doctor_left_at',
                'livekit_patient_left_at',
            ]);
        });
    }
};
