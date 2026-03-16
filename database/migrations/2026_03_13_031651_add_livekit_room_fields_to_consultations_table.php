<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->string('livekit_room_name')->nullable()->unique()->after('session_token');
            $table->string('livekit_room_sid')->nullable()->unique()->after('livekit_room_name');
            $table->string('livekit_room_status')->default('not_started')->after('livekit_room_sid');
            $table->timestamp('livekit_room_created_at')->nullable()->after('livekit_room_status');
            $table->timestamp('livekit_last_activity_at')->nullable()->after('livekit_room_created_at');
            $table->timestamp('livekit_ended_at')->nullable()->after('livekit_last_activity_at');
            $table->text('livekit_last_error')->nullable()->after('livekit_ended_at');

            $table->index('livekit_room_status');
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropIndex(['livekit_room_status']);
            $table->dropColumn([
                'livekit_room_name',
                'livekit_room_sid',
                'livekit_room_status',
                'livekit_room_created_at',
                'livekit_last_activity_at',
                'livekit_ended_at',
                'livekit_last_error',
            ]);
        });
    }
};
