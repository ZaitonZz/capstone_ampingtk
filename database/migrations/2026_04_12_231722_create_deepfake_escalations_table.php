<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deepfake_escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('triggered_role', ['patient', 'doctor']);
            $table->enum('type', ['admin_alert', 'doctor_decision']);
            $table->unsignedTinyInteger('streak_count')->default(5);
            $table->enum('status', ['open', 'resolved'])->default('open');
            $table->enum('decision', ['continue', 'cancel'])->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['type', 'status'], 'deepfake_escalations_type_status_idx');
            $table->index(['consultation_id', 'status'], 'deepfake_escalations_cons_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deepfake_escalations');
    }
};
