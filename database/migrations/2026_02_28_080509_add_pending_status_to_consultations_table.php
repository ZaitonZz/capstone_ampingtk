<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE consultations MODIFY COLUMN status ENUM('pending','scheduled','ongoing','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled'");
    }

    public function down(): void
    {
        // Move any 'pending' rows back to 'scheduled' before removing the value
        DB::statement("UPDATE consultations SET status = 'scheduled' WHERE status = 'pending'");
        DB::statement("ALTER TABLE consultations MODIFY COLUMN status ENUM('scheduled','ongoing','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled'");
    }
};
