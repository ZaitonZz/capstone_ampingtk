<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 120);
            $table->text('description')->nullable();
            $table->nullableMorphs('subject');
            $table->string('ip_address', 45)->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            $table->index(['event', 'created_at'], 'activity_logs_event_created_idx');
            $table->index(['user_id', 'created_at'], 'activity_logs_user_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
