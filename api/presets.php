<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = require_user();
$userId = (int) $user['id'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $presetId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($presetId > 0) {
        $stmt = db()->prepare(
            'SELECT id, name, slug, preset_path, preset_json, created_at, updated_at
             FROM presets
             WHERE id = :id AND user_id = :user_id
             LIMIT 1'
        );
        $stmt->execute(['id' => $presetId, 'user_id' => $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            json_response(['ok' => false, 'error' => 'Preset not found.'], 404);
        }
        $payload = json_decode((string) $row['preset_json'], true);
        json_response([
            'ok' => true,
            'item' => [
                'id' => (int) $row['id'],
                'name' => (string) $row['name'],
                'slug' => (string) $row['slug'],
                'created_at' => (string) $row['created_at'],
                'updated_at' => (string) $row['updated_at'],
                'preset_path' => (string) $row['preset_path'],
                'payload' => is_array($payload) ? $payload : null,
                'download_url' => app_base_url() . '/api/download.php?entity=preset&id=' . (int) $row['id'],
                'open_url' => app_base_url() . '/app.html?preset_id=' . (int) $row['id'],
            ],
        ]);
    }

    $stmt = db()->prepare(
        'SELECT id, name, slug, preset_path, created_at, updated_at
         FROM presets
         WHERE user_id = :user_id
         ORDER BY created_at DESC, id DESC'
    );
    $stmt->execute(['user_id' => $userId]);
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'slug' => (string) $row['slug'],
            'preset_path' => (string) $row['preset_path'],
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
            'download_url' => app_base_url() . '/api/download.php?entity=preset&id=' . (int) $row['id'],
            'open_url' => app_base_url() . '/app.html?preset_id=' . (int) $row['id'],
        ];
    }
    json_response(['ok' => true, 'items' => $items]);
}

require_post_method();

$input = request_json();
$name = trim((string) ($input['name'] ?? ''));
$config = $input['config'] ?? null;
$schema = (int) ($input['schema'] ?? 1);

if ($name === '') {
    json_response(['ok' => false, 'error' => 'Preset name is required.'], 422);
}
if (!is_array($config)) {
    json_response(['ok' => false, 'error' => 'Preset config must be an object.'], 422);
}

$payload = [
    'schema' => $schema > 0 ? $schema : 1,
    'name' => $name,
    'config' => $config,
];

$slug = slugify($name, 'preset');
$paths = user_storage_paths($userId);
$fileName = date('Ymd-His') . '-' . $slug . '.json';
$absolutePath = $paths['presets'] . '/' . $fileName;
$relativePath = 'user-' . $userId . '/presets/' . $fileName;
write_json_file($absolutePath, $payload);

$timestamp = now_iso();
$insert = db()->prepare(
    'INSERT INTO presets (user_id, name, slug, preset_path, preset_json, created_at, updated_at)
     VALUES (:user_id, :name, :slug, :preset_path, :preset_json, :created_at, :updated_at)'
);
$insert->execute([
    'user_id' => $userId,
    'name' => $name,
    'slug' => $slug,
    'preset_path' => $relativePath,
    'preset_json' => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    'created_at' => $timestamp,
    'updated_at' => $timestamp,
]);

$id = (int) db()->lastInsertId();
json_response([
    'ok' => true,
    'message' => 'Preset saved to account.',
    'item' => [
        'id' => $id,
        'name' => $name,
        'preset_path' => $relativePath,
        'download_url' => app_base_url() . '/api/download.php?entity=preset&id=' . $id,
        'open_url' => app_base_url() . '/app.html?preset_id=' . $id,
    ],
]);
