<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deepfake_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->enum('result', ['real', 'fake', 'inconclusive'])->default('inconclusive');
            $table->decimal('confidence_score', 5, 4)->nullable()->comment('0.0000 – 1.0000');
            $table->string('frame_path')->nullable()->comment('Path to captured video frame');
            $table->unsignedInteger('frame_number')->nullable();
            $table->string('model_version', 50)->nullable();
            $table->boolean('flagged')->default(false);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_notes')->nullable();
            $table->timestamp('scanned_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deepfake_scan_logs');
    }
};
