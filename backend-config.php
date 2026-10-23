<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'Mapbox Building Generator',
        'base_url' => '',
        'session_name' => 'mbg_session',
    ],
    'database' => [
        'driver' => 'sqlite',
        'sqlite_path' => __DIR__ . '/storage/database/mbg.sqlite',
        'mysql' => [
            'host' => 'localhost',
            'port' => 3306,
            'database' => 'mbg_app',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4',
        ],
    ],
    'storage' => [
        'root' => __DIR__ . '/storage/users',
    ],
    'demo_user' => [
        'email' => 'demo@mapboxbuildinggenerator.local',
        'password' => 'DemoPass123!',
        'full_name' => 'Demo User',
        'studio_name' => 'Mercator Studio',
        'role_title' => 'Design Lead',
        'timezone' => 'America/Toronto',
        'accent_color' => '#245f8e',
        'default_export_format' => 'glb',
    ],
];
