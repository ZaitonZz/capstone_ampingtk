<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultation_microchecks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'claimed', 'completed', 'expired'])->default('pending');
            $table->timestamp('scheduled_at');
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->timestamps();

            $table->index(['consultation_id', 'status', 'scheduled_at'], 'microchecks_cons_status_sched_idx');
            $table->index(['status', 'scheduled_at'], 'microchecks_status_sched_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_microchecks');
    }
};
