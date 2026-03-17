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
        Schema::table('patient_photos', function (Blueprint $table) {
            $table->json('face_embedding')->nullable()->after('notes')
                ->comment('ArcFace 512-d embedding vector, null until enrolled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_photos', function (Blueprint $table) {
            $table->dropColumn('face_embedding');
        });
    }
};
