<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table): void {
            $table->string('pipeline_detection_status')->nullable()->after('deepfake_verified');
            $table->timestamp('pipeline_detection_started_at')->nullable()->after('pipeline_detection_status');
            $table->timestamp('pipeline_last_heartbeat_at')->nullable()->after('pipeline_detection_started_at');
            $table->timestamp('pipeline_last_scan_at')->nullable()->after('pipeline_last_heartbeat_at');
            $table->text('pipeline_last_error')->nullable()->after('pipeline_last_scan_at');
            $table->json('pipeline_guidance')->nullable()->after('pipeline_last_error');
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table): void {
            $table->dropColumn([
                'pipeline_detection_status',
                'pipeline_detection_started_at',
                'pipeline_last_heartbeat_at',
                'pipeline_last_scan_at',
                'pipeline_last_error',
                'pipeline_guidance',
            ]);
        });
    }
};
