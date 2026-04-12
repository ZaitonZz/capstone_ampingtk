<?php

use Inertia\Testing\AssertableInertia as Assert;

test('guests can view the privacy policy page', function () {
    $this->get(route('privacy-policy'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('privacy-policy'));
});