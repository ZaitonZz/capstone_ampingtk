<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'doctor', 'medicalstaff', 'patient'])->default('doctor')->change();
        });
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'medicalstaff')->update(['role' => 'doctor']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'doctor', 'patient'])->default('doctor')->change();
        });
    }
};
