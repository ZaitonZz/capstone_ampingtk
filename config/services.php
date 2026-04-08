<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'livekit' => [
        'enabled' => (bool) env('LIVEKIT_ENABLED', false),
        'url' => env('LIVEKIT_API_URL'),
        'ws_url' => env('LIVEKIT_WS_URL'),
        'api_key' => env('LIVEKIT_API_KEY'),
        'api_secret' => env('LIVEKIT_API_SECRET'),
        'empty_timeout_seconds' => (int) env('LIVEKIT_EMPTY_TIMEOUT_SECONDS', 600),
        'max_participants' => (int) env('LIVEKIT_MAX_PARTICIPANTS', 3),
        'participant_ttl_minutes' => (int) env('LIVEKIT_PARTICIPANT_TTL_MINUTES', 120),
    ],

    'pipeline' => [
        'secret' => env('PIPELINE_SECRET'),
        'microcheck_min_interval_seconds' => (int) env('PIPELINE_MICROCHECK_MIN_INTERVAL_SECONDS', 5),
        'microcheck_max_interval_seconds' => (int) env('PIPELINE_MICROCHECK_MAX_INTERVAL_SECONDS', 20),
        'microcheck_expiry_seconds' => (int) env('PIPELINE_MICROCHECK_EXPIRY_SECONDS', 45),
    ],

];
