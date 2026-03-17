<?php

use App\Models\User;

test('returns a successful response', function () {
    $user = User::factory()->create();
    $response = $this->actingAsVerified($user)->get(route('home'));

    // Home route redirects authenticated users to their dashboard
    $response->assertRedirect();
});
