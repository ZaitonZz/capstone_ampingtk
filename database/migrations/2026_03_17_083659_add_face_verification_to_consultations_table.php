<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('consultation_face_verification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->boolean('matched')->comment('True when ArcFace matched the expected patient');
            $table->decimal('face_match_score', 5, 4)->comment('Cosine similarity [0.0-1.0] from ArcFace recognition');
            $table->boolean('flagged')->default(false)->comment('True when potential impersonation is flagged');
            $table->timestamp('checked_at')->nullable()->comment('When the verification decision was produced');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('consultation_face_verification_logs');
    }
};
