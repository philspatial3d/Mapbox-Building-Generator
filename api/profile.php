<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = require_user();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    json_response(['ok' => true, 'data' => profile_payload($user)]);
}

require_post_method();

$input = request_json();
upsert_profile((int) $user['id'], [
    'full_name' => $input['full_name'] ?? '',
    'studio_name' => $input['studio_name'] ?? '',
    'role_title' => $input['role_title'] ?? '',
    'accent_color' => $input['accent_color'] ?? '#245f8e',
    'timezone' => $input['timezone'] ?? 'America/Toronto',
    'default_export_format' => $input['default_export_format'] ?? 'glb',
    'mapbox_public_token' => $input['mapbox_public_token'] ?? '',
    'notes' => $input['notes'] ?? '',
]);

$freshUser = require_user();
json_response(['ok' => true, 'message' => 'Profile saved.', 'data' => profile_payload($freshUser)]);
