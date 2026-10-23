<?php

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    $bootstrapConfig = require dirname(__DIR__) . '/backend-config.php';
    session_name((string) ($bootstrapConfig['app']['session_name'] ?? 'mbg_session'));
    session_start();
}

function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $config = require dirname(__DIR__) . '/backend-config.php';
    return $config;
}

function app_base_url(): string
{
    $configured = trim((string) (app_config()['app']['base_url'] ?? ''));
    if ($configured !== '') {
        return rtrim($configured, '/');
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    $scheme = $https ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/');
    if ($dir === '/api') {
        $dir = '';
    } elseif (substr($dir, -4) === '/api') {
        $dir = substr($dir, 0, -4);
    }

    return rtrim($scheme . '://' . $host . $dir, '/');
}

function ensure_directory(string $path): void
{
    if (is_dir($path)) {
        return;
    }

    if (!mkdir($path, 0775, true) && !is_dir($path)) {
        throw new RuntimeException('Could not create directory: ' . $path);
    }
}

function storage_root(): string
{
    $root = (string) (app_config()['storage']['root'] ?? dirname(__DIR__) . '/storage/users');
    ensure_directory($root);
    return $root;
}

function database_path(): string
{
    return (string) (app_config()['database']['sqlite_path'] ?? dirname(__DIR__) . '/storage/database/mbg.sqlite');
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = app_config()['database'] ?? [];
    $driver = strtolower((string) ($cfg['driver'] ?? 'sqlite'));

    if ($driver === 'mysql') {
        $mysql = $cfg['mysql'] ?? [];
        $charset = (string) ($mysql['charset'] ?? 'utf8mb4');
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            (string) ($mysql['host'] ?? 'localhost'),
            (int) ($mysql['port'] ?? 3306),
            (string) ($mysql['database'] ?? ''),
            $charset
        );
        $pdo = new PDO(
            $dsn,
            (string) ($mysql['username'] ?? ''),
            (string) ($mysql['password'] ?? ''),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    } else {
        $sqlitePath = database_path();
        ensure_directory(dirname($sqlitePath));
        $pdo = new PDO(
            'sqlite:' . $sqlitePath,
            null,
            null,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }

    initialize_schema($pdo, $driver);

    return $pdo;
}

function initialize_schema(PDO $pdo, string $driver): void
{
    if ($driver === 'mysql') {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(191) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS user_profiles (
                user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
                full_name VARCHAR(191) DEFAULT NULL,
                studio_name VARCHAR(191) DEFAULT NULL,
                role_title VARCHAR(191) DEFAULT NULL,
                accent_color VARCHAR(16) DEFAULT NULL,
                timezone VARCHAR(80) DEFAULT NULL,
                default_export_format VARCHAR(24) DEFAULT NULL,
                mapbox_public_token TEXT DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS presets (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                name VARCHAR(191) NOT NULL,
                slug VARCHAR(191) NOT NULL,
                preset_path TEXT NOT NULL,
                preset_json LONGTEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_presets_user_created (user_id, created_at),
                CONSTRAINT fk_presets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS buildings (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NOT NULL,
                name VARCHAR(191) NOT NULL,
                slug VARCHAR(191) NOT NULL,
                glb_path TEXT NOT NULL,
                geojson_path TEXT NOT NULL,
                config_path TEXT NOT NULL,
                preset_path TEXT DEFAULT NULL,
                glb_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
                config_json LONGTEXT NOT NULL,
                geojson_json LONGTEXT NOT NULL,
                preset_json LONGTEXT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_buildings_user_created (user_id, created_at),
                CONSTRAINT fk_buildings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
        );
    } else {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS user_profiles (
                user_id INTEGER PRIMARY KEY,
                full_name TEXT,
                studio_name TEXT,
                role_title TEXT,
                accent_color TEXT,
                timezone TEXT,
                default_export_format TEXT,
                mapbox_public_token TEXT,
                notes TEXT,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                preset_path TEXT NOT NULL,
                preset_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )'
        );
        $pdo->exec(
            'CREATE INDEX IF NOT EXISTS idx_presets_user_created ON presets(user_id, created_at)'
        );
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                glb_path TEXT NOT NULL,
                geojson_path TEXT NOT NULL,
                config_path TEXT NOT NULL,
                preset_path TEXT,
                glb_size INTEGER NOT NULL DEFAULT 0,
                config_json TEXT NOT NULL,
                geojson_json TEXT NOT NULL,
                preset_json TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )'
        );
        $pdo->exec(
            'CREATE INDEX IF NOT EXISTS idx_buildings_user_created ON buildings(user_id, created_at)'
        );
    }
}

function now_iso(): string
{
    return gmdate('Y-m-d H:i:s');
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function request_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(['ok' => false, 'error' => 'Invalid JSON body.'], 422);
    }

    return $decoded;
}

function normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function slugify(string $value, string $fallback = 'item'): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : $fallback;
}

function current_user(): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!$userId) {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.email, p.full_name, p.studio_name, p.role_title, p.accent_color, p.timezone, p.default_export_format
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_response(['ok' => false, 'error' => 'Authentication required.'], 401);
    }

    return $user;
}

function login_user(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
}

function logout_user(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function user_storage_paths(int $userId): array
{
    $userRoot = storage_root() . '/user-' . $userId;
    $paths = [
        'root' => $userRoot,
        'presets' => $userRoot . '/presets',
        'buildings' => $userRoot . '/buildings',
    ];
    foreach ($paths as $path) {
        ensure_directory($path);
    }
    return $paths;
}

function write_json_file(string $path, array $payload): void
{
    $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($encoded === false) {
        throw new RuntimeException('Could not encode JSON payload for ' . $path);
    }
    if (file_put_contents($path, $encoded) === false) {
        throw new RuntimeException('Could not write file: ' . $path);
    }
}

function upsert_profile(int $userId, array $profile): void
{
    $stmt = db()->prepare('SELECT user_id FROM user_profiles WHERE user_id = :user_id LIMIT 1');
    $stmt->execute(['user_id' => $userId]);
    $exists = (bool) $stmt->fetchColumn();

    $payload = [
        'user_id' => $userId,
        'full_name' => trim((string) ($profile['full_name'] ?? '')),
        'studio_name' => trim((string) ($profile['studio_name'] ?? '')),
        'role_title' => trim((string) ($profile['role_title'] ?? '')),
        'accent_color' => trim((string) ($profile['accent_color'] ?? '')),
        'timezone' => trim((string) ($profile['timezone'] ?? '')),
        'default_export_format' => trim((string) ($profile['default_export_format'] ?? 'glb')),
        'mapbox_public_token' => trim((string) ($profile['mapbox_public_token'] ?? '')),
        'notes' => trim((string) ($profile['notes'] ?? '')),
        'updated_at' => now_iso(),
    ];

    if ($exists) {
        $update = db()->prepare(
            'UPDATE user_profiles
             SET full_name = :full_name,
                 studio_name = :studio_name,
                 role_title = :role_title,
                 accent_color = :accent_color,
                 timezone = :timezone,
                 default_export_format = :default_export_format,
                 mapbox_public_token = :mapbox_public_token,
                 notes = :notes,
                 updated_at = :updated_at
             WHERE user_id = :user_id'
        );
        $update->execute($payload);
        return;
    }

    $insert = db()->prepare(
        'INSERT INTO user_profiles (
            user_id, full_name, studio_name, role_title, accent_color, timezone, default_export_format, mapbox_public_token, notes, updated_at
         ) VALUES (
            :user_id, :full_name, :studio_name, :role_title, :accent_color, :timezone, :default_export_format, :mapbox_public_token, :notes, :updated_at
         )'
    );
    $insert->execute($payload);
}

function ensure_demo_user(bool $seedStarterPreset = true): array
{
    $demo = app_config()['demo_user'] ?? [];
    $email = normalize_email((string) ($demo['email'] ?? 'demo@mapboxbuildinggenerator.local'));
    $password = (string) ($demo['password'] ?? 'DemoPass123!');

    $select = db()->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $select->execute(['email' => $email]);
    $userId = $select->fetchColumn();

    if (!$userId) {
        $insert = db()->prepare(
            'INSERT INTO users (email, password_hash, created_at, updated_at)
             VALUES (:email, :password_hash, :created_at, :updated_at)'
        );
        $timestamp = now_iso();
        $insert->execute([
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
        $userId = (int) db()->lastInsertId();
    } else {
        $userId = (int) $userId;
    }

    upsert_profile($userId, [
        'full_name' => (string) ($demo['full_name'] ?? 'Demo User'),
        'studio_name' => (string) ($demo['studio_name'] ?? 'Mercator Studio'),
        'role_title' => (string) ($demo['role_title'] ?? 'Design Lead'),
        'accent_color' => (string) ($demo['accent_color'] ?? '#245f8e'),
        'timezone' => (string) ($demo['timezone'] ?? 'America/Toronto'),
        'default_export_format' => (string) ($demo['default_export_format'] ?? 'glb'),
        'mapbox_public_token' => '',
        'notes' => 'Seeded demo workspace for backend integration testing.',
    ]);

    if ($seedStarterPreset) {
        seed_demo_preset_if_missing($userId);
    }

    return [
        'id' => $userId,
        'email' => $email,
        'password' => $password,
    ];
}

function load_seed_preset_payload(): array
{
    $defaultsPath = dirname(__DIR__) . '/presets/defaults.json';
    if (is_file($defaultsPath)) {
        $decoded = json_decode((string) file_get_contents($defaultsPath), true);
        $items = [];
        if (isset($decoded['presets']) && is_array($decoded['presets'])) {
            $items = $decoded['presets'];
        } elseif (is_array($decoded)) {
            $items = $decoded;
        }
        foreach ($items as $item) {
            if (!is_array($item) || empty($item['name']) || empty($item['config']) || !is_array($item['config'])) {
                continue;
            }
            return [
                'schema' => (int) ($item['schema'] ?? 1),
                'name' => (string) $item['name'],
                'config' => $item['config'],
            ];
        }
    }

    return [
        'schema' => 1,
        'name' => 'Starter Massing Template',
        'config' => [
            'floors' => 16,
            'F' => 3.6,
            'windowStyle' => 'ribbon',
            'wallColor' => '#dbe9f2',
            'windowColor' => '#5ea3db',
            'roofCol' => '#536474',
        ],
    ];
}

function seed_demo_preset_if_missing(int $userId): void
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM presets WHERE user_id = :user_id');
    $stmt->execute(['user_id' => $userId]);
    if ((int) $stmt->fetchColumn() > 0) {
        return;
    }

    $preset = load_seed_preset_payload();
    $paths = user_storage_paths($userId);
    $slug = slugify((string) $preset['name'], 'starter-template');
    $fileName = date('Ymd-His') . '-' . $slug . '.json';
    $relativePath = 'user-' . $userId . '/presets/' . $fileName;
    $absolutePath = $paths['presets'] . '/' . $fileName;
    write_json_file($absolutePath, $preset);

    $timestamp = now_iso();
    $insert = db()->prepare(
        'INSERT INTO presets (user_id, name, slug, preset_path, preset_json, created_at, updated_at)
         VALUES (:user_id, :name, :slug, :preset_path, :preset_json, :created_at, :updated_at)'
    );
    $insert->execute([
        'user_id' => $userId,
        'name' => (string) $preset['name'],
        'slug' => $slug,
        'preset_path' => $relativePath,
        'preset_json' => json_encode($preset, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ]);
}

function relative_to_storage(string $absolutePath): string
{
    $root = rtrim(storage_root(), '/');
    $absolutePath = str_replace('\\', '/', $absolutePath);
    if (substr($absolutePath, 0, strlen($root . '/')) === $root . '/') {
        return ltrim(substr($absolutePath, strlen($root) + 1), '/');
    }

    return $absolutePath;
}

function absolute_storage_path(string $storedPath): string
{
    $storedPath = ltrim($storedPath, '/');
    return rtrim(storage_root(), '/') . '/' . $storedPath;
}

function profile_payload(array $user): array
{
    $stmt = db()->prepare(
        'SELECT full_name, studio_name, role_title, accent_color, timezone, default_export_format, mapbox_public_token, notes, updated_at
         FROM user_profiles WHERE user_id = :user_id LIMIT 1'
    );
    $stmt->execute(['user_id' => (int) $user['id']]);
    $profile = $stmt->fetch() ?: [];

    $countsStmt = db()->prepare(
        'SELECT
            (SELECT COUNT(*) FROM presets WHERE user_id = :user_id) AS preset_count,
            (SELECT COUNT(*) FROM buildings WHERE user_id = :user_id) AS building_count'
    );
    $countsStmt->execute(['user_id' => (int) $user['id']]);
    $counts = $countsStmt->fetch() ?: ['preset_count' => 0, 'building_count' => 0];

    return [
        'user' => [
            'id' => (int) $user['id'],
            'email' => (string) $user['email'],
        ],
        'profile' => [
            'full_name' => (string) ($profile['full_name'] ?? ''),
            'studio_name' => (string) ($profile['studio_name'] ?? ''),
            'role_title' => (string) ($profile['role_title'] ?? ''),
            'accent_color' => (string) ($profile['accent_color'] ?? '#245f8e'),
            'timezone' => (string) ($profile['timezone'] ?? 'America/Toronto'),
            'default_export_format' => (string) ($profile['default_export_format'] ?? 'glb'),
            'mapbox_public_token' => (string) ($profile['mapbox_public_token'] ?? ''),
            'notes' => (string) ($profile['notes'] ?? ''),
            'updated_at' => (string) ($profile['updated_at'] ?? ''),
        ],
        'summary' => [
            'preset_count' => (int) ($counts['preset_count'] ?? 0),
            'building_count' => (int) ($counts['building_count'] ?? 0),
        ],
        'storage' => [
            'driver' => (string) (app_config()['database']['driver'] ?? 'sqlite'),
            'user_root' => 'storage/users/user-' . (int) $user['id'],
            'preset_folder' => 'storage/users/user-' . (int) $user['id'] . '/presets',
            'building_folder' => 'storage/users/user-' . (int) $user['id'] . '/buildings',
        ],
    ];
}

function require_post_method(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_response(['ok' => false, 'error' => 'POST required.'], 405);
    }
}
