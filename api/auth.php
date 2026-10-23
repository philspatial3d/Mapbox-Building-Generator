<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    $user = current_user();
    json_response([
        'ok' => true,
        'authenticated' => (bool) $user,
        'user' => $user ? profile_payload($user) : null,
        'demo_user' => [
            'email' => (string) (app_config()['demo_user']['email'] ?? ''),
            'password' => (string) (app_config()['demo_user']['password'] ?? ''),
        ],
    ]);
}

require_post_method();

$input = request_json();
$action = (string) ($input['action'] ?? '');

if ($action === 'register') {
    $email = normalize_email((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    $fullName = trim((string) ($input['full_name'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['ok' => false, 'error' => 'A valid email is required.'], 422);
    }
    if (strlen($password) < 8) {
        json_response(['ok' => false, 'error' => 'Password must be at least 8 characters.'], 422);
    }

    $check = db()->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $check->execute(['email' => $email]);
    if ($check->fetchColumn()) {
        json_response(['ok' => false, 'error' => 'An account with that email already exists.'], 409);
    }

    $timestamp = now_iso();
    $insert = db()->prepare(
        'INSERT INTO users (email, password_hash, created_at, updated_at)
         VALUES (:email, :password_hash, :created_at, :updated_at)'
    );
    $insert->execute([
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ]);
    $userId = (int) db()->lastInsertId();
    upsert_profile($userId, [
        'full_name' => $fullName,
        'studio_name' => '',
        'role_title' => '',
        'accent_color' => '#245f8e',
        'timezone' => 'America/Toronto',
        'default_export_format' => 'glb',
        'mapbox_public_token' => '',
        'notes' => '',
    ]);
    login_user($userId);
    $user = require_user();
    json_response(['ok' => true, 'message' => 'Account created.', 'user' => profile_payload($user)]);
}

if ($action === 'login') {
    $email = normalize_email((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    $stmt = db()->prepare('SELECT id, email, password_hash FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, (string) $row['password_hash'])) {
        json_response(['ok' => false, 'error' => 'Invalid email or password.'], 401);
    }

    login_user((int) $row['id']);
    $user = require_user();
    json_response(['ok' => true, 'message' => 'Signed in.', 'user' => profile_payload($user)]);
}

if ($action === 'logout') {
    logout_user();
    json_response(['ok' => true, 'message' => 'Signed out.']);
}

if ($action === 'demo_login') {
    $demo = ensure_demo_user(true);
    login_user((int) $demo['id']);
    $user = require_user();
    json_response([
        'ok' => true,
        'message' => 'Demo account ready.',
        'user' => profile_payload($user),
        'demo_user' => $demo,
    ]);
}

json_response(['ok' => false, 'error' => 'Unknown auth action.'], 422);
