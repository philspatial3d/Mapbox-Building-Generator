<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = require_user();
$userId = (int) $user['id'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $stmt = db()->prepare(
        'SELECT id, name, slug, glb_path, geojson_path, config_path, preset_path, glb_size, created_at, updated_at
         FROM buildings
         WHERE user_id = :user_id
         ORDER BY created_at DESC, id DESC'
    );
    $stmt->execute(['user_id' => $userId]);
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $id = (int) $row['id'];
        $items[] = [
            'id' => $id,
            'name' => (string) $row['name'],
            'slug' => (string) $row['slug'],
            'glb_size' => (int) $row['glb_size'],
            'created_at' => (string) $row['created_at'],
            'updated_at' => (string) $row['updated_at'],
            'paths' => [
                'glb' => (string) $row['glb_path'],
                'geojson' => (string) $row['geojson_path'],
                'config' => (string) $row['config_path'],
                'preset' => (string) ($row['preset_path'] ?? ''),
            ],
            'downloads' => [
                'glb' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=glb',
                'geojson' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=geojson',
                'config' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=config',
                'preset' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=preset',
            ],
        ];
    }
    json_response(['ok' => true, 'items' => $items]);
}

require_post_method();

$name = trim((string) ($_POST['name'] ?? ''));
$configJson = (string) ($_POST['config_json'] ?? '');
$geojsonJson = (string) ($_POST['geojson_json'] ?? '');
$presetJson = isset($_POST['preset_json']) ? trim((string) $_POST['preset_json']) : '';

if ($name === '') {
    json_response(['ok' => false, 'error' => 'Building name is required.'], 422);
}
if ($configJson === '' || !is_array(json_decode($configJson, true))) {
    json_response(['ok' => false, 'error' => 'config_json must be valid JSON.'], 422);
}
if ($geojsonJson === '' || !is_array(json_decode($geojsonJson, true))) {
    json_response(['ok' => false, 'error' => 'geojson_json must be valid JSON.'], 422);
}
if ($presetJson !== '' && !is_array(json_decode($presetJson, true))) {
    json_response(['ok' => false, 'error' => 'preset_json must be valid JSON if provided.'], 422);
}
if (!isset($_FILES['glb_file']) || !is_uploaded_file($_FILES['glb_file']['tmp_name'])) {
    json_response(['ok' => false, 'error' => 'A GLB upload is required.'], 422);
}

$slug = slugify($name, 'building');
$timestampKey = date('Ymd-His');
$paths = user_storage_paths($userId);
$buildingFolder = $paths['buildings'] . '/' . $timestampKey . '-' . $slug;
ensure_directory($buildingFolder);

$glbTarget = $buildingFolder . '/' . $slug . '.glb';
if (!move_uploaded_file($_FILES['glb_file']['tmp_name'], $glbTarget)) {
    json_response(['ok' => false, 'error' => 'Could not store the GLB file.'], 500);
}

$configTarget = $buildingFolder . '/' . $slug . '-config.json';
$geojsonTarget = $buildingFolder . '/' . $slug . '.geojson';
$presetTarget = $presetJson !== '' ? $buildingFolder . '/' . $slug . '-preset.json' : null;

$configPayload = json_decode($configJson, true);
$geojsonPayload = json_decode($geojsonJson, true);
$presetPayload = $presetJson !== '' ? json_decode($presetJson, true) : null;

write_json_file($configTarget, is_array($configPayload) ? $configPayload : []);
write_json_file($geojsonTarget, is_array($geojsonPayload) ? $geojsonPayload : []);
if ($presetTarget && is_array($presetPayload)) {
    write_json_file($presetTarget, $presetPayload);
}

$relativeRoot = 'user-' . $userId . '/buildings/' . basename($buildingFolder);
$record = [
    'user_id' => $userId,
    'name' => $name,
    'slug' => $slug,
    'glb_path' => $relativeRoot . '/' . basename($glbTarget),
    'geojson_path' => $relativeRoot . '/' . basename($geojsonTarget),
    'config_path' => $relativeRoot . '/' . basename($configTarget),
    'preset_path' => $presetTarget ? $relativeRoot . '/' . basename($presetTarget) : null,
    'glb_size' => filesize($glbTarget) ?: 0,
    'config_json' => json_encode($configPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    'geojson_json' => json_encode($geojsonPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    'preset_json' => is_array($presetPayload) ? json_encode($presetPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : null,
    'created_at' => now_iso(),
    'updated_at' => now_iso(),
];

$insert = db()->prepare(
    'INSERT INTO buildings (
        user_id, name, slug, glb_path, geojson_path, config_path, preset_path, glb_size, config_json, geojson_json, preset_json, created_at, updated_at
     ) VALUES (
        :user_id, :name, :slug, :glb_path, :geojson_path, :config_path, :preset_path, :glb_size, :config_json, :geojson_json, :preset_json, :created_at, :updated_at
     )'
);
$insert->execute($record);

$id = (int) db()->lastInsertId();
json_response([
    'ok' => true,
    'message' => 'Building saved to account.',
    'item' => [
        'id' => $id,
        'name' => $name,
        'downloads' => [
            'glb' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=glb',
            'geojson' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=geojson',
            'config' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=config',
            'preset' => app_base_url() . '/api/download.php?entity=building&id=' . $id . '&file=preset',
        ],
    ],
]);
