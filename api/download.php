<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$user = require_user();
$userId = (int) $user['id'];
$entity = (string) ($_GET['entity'] ?? '');
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$file = (string) ($_GET['file'] ?? '');

if ($id <= 0) {
    http_response_code(400);
    echo 'Missing id.';
    exit;
}

if ($entity === 'preset') {
    $stmt = db()->prepare('SELECT name, preset_path FROM presets WHERE id = :id AND user_id = :user_id LIMIT 1');
    $stmt->execute(['id' => $id, 'user_id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo 'Preset not found.';
        exit;
    }
    $absolute = absolute_storage_path((string) $row['preset_path']);
    if (!is_file($absolute)) {
        http_response_code(404);
        echo 'Preset file missing.';
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . slugify((string) $row['name'], 'preset') . '.json"');
    readfile($absolute);
    exit;
}

if ($entity === 'building') {
    $stmt = db()->prepare(
        'SELECT name, glb_path, geojson_path, config_path, preset_path
         FROM buildings
         WHERE id = :id AND user_id = :user_id
         LIMIT 1'
    );
    $stmt->execute(['id' => $id, 'user_id' => $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo 'Building not found.';
        exit;
    }

    $pathMap = [
        'glb' => ['path' => (string) $row['glb_path'], 'content_type' => 'model/gltf-binary', 'extension' => 'glb'],
        'geojson' => ['path' => (string) $row['geojson_path'], 'content_type' => 'application/geo+json', 'extension' => 'geojson'],
        'config' => ['path' => (string) $row['config_path'], 'content_type' => 'application/json; charset=utf-8', 'extension' => 'json'],
        'preset' => ['path' => (string) ($row['preset_path'] ?? ''), 'content_type' => 'application/json; charset=utf-8', 'extension' => 'json'],
    ];
    if (!isset($pathMap[$file]) || $pathMap[$file]['path'] === '') {
        http_response_code(404);
        echo 'Requested file not available.';
        exit;
    }

    $absolute = absolute_storage_path($pathMap[$file]['path']);
    if (!is_file($absolute)) {
        http_response_code(404);
        echo 'Stored file missing.';
        exit;
    }

    header('Content-Type: ' . $pathMap[$file]['content_type']);
    header('Content-Disposition: attachment; filename="' . slugify((string) $row['name'], 'building') . '-' . $file . '.' . $pathMap[$file]['extension'] . '"');
    readfile($absolute);
    exit;
}

http_response_code(400);
echo 'Unsupported entity.';
