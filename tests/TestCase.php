<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * Act as an authenticated user with OTP verification already complete
     */
    public function actingAsVerified(Authenticatable $user): static
    {
        return $this->actingAs($user)
            ->withSession(['otp_verified' => true]);
    }
}
