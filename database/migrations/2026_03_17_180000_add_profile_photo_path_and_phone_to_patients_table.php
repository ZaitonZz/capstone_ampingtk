<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('last_name');
            $table->string('profile_photo_path')->nullable()->after('address');
            $table->unique('email');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropUnique(['email']);
            $table->dropColumn(['phone', 'profile_photo_path']);
        });
    }
};
