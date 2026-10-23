<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$message = '';
$error = '';
$demoUser = null;

try {
    db();
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
        $action = (string) ($_POST['action'] ?? '');
        if ($action === 'seed_demo') {
            $demoUser = ensure_demo_user(true);
            $message = 'Sample user is ready.';
        }
    }
    if ($demoUser === null) {
        $demoUser = ensure_demo_user(true);
    }
} catch (Throwable $e) {
    $error = $e->getMessage();
}

$config = app_config();
$dbDriver = (string) ($config['database']['driver'] ?? 'sqlite');
$storageRoot = storage_root();
?>
<!doctype html>
<html lang="en">
<head>
<link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Backend Setup | Mapbox Building Generator</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    :root{
      --bg:#e5eaf0;
      --paper:#f5f8fc;
      --panel:#eef3f7;
      --ink:#1a232d;
      --ink-soft:#536474;
      --line:#8fa0b1;
      --line-strong:#3c4d5e;
      --accent:#245f8e;
      --green:#2f7158;
      --warn:#8f4d2c;
      --bad:#9b4642;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      font-family:"IBM Plex Sans","Avenir Next",sans-serif;
      color:var(--ink);
      background:
        repeating-linear-gradient(0deg, rgba(60,77,94,.05) 0 1px, transparent 1px 34px),
        repeating-linear-gradient(90deg, rgba(60,77,94,.05) 0 1px, transparent 1px 34px),
        var(--bg);
    }
    .wrap{max-width:1080px;margin:0 auto;padding:24px 16px 56px}
    .topbar,.card{
      border:2px solid var(--line-strong);
      background:rgba(245,248,252,.96);
      box-shadow:0 8px 0 rgba(60,77,94,.12);
    }
    .topbar{
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center;
      padding:12px 14px;
      margin-bottom:14px;
      flex-wrap:wrap;
    }
    .stamp{
      font:700 12px/1.2 "IBM Plex Mono",monospace;
      text-transform:uppercase;
      letter-spacing:.08em;
      color:var(--ink-soft);
    }
    .actions{display:flex;gap:8px;flex-wrap:wrap}
    .btn{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:10px 14px;
      border:2px solid var(--line-strong);
      background:#fff;
      color:var(--ink);
      text-decoration:none;
      font-weight:700;
    }
    .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .btn.green{background:var(--green);border-color:var(--green);color:#fff}
    h1,h2{font-family:"Source Serif 4",serif;margin:0 0 10px}
    h1{font-size:clamp(2rem,5vw,3.8rem);line-height:1.05}
    h2{font-size:clamp(1.25rem,3vw,1.8rem)}
    p{margin:0 0 12px;color:var(--ink-soft);line-height:1.55}
    .grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:12px;
    }
    .card{padding:18px}
    .meta{
      display:grid;
      gap:8px;
      font-size:14px;
    }
    .meta div{
      padding:10px 12px;
      background:var(--panel);
      border:1px solid var(--line);
    }
    code{
      font-family:"IBM Plex Mono",monospace;
      font-size:12px;
      overflow-wrap:anywhere;
    }
    .callout{
      padding:12px 14px;
      border:2px solid var(--line);
      background:#fff;
      margin-bottom:12px;
    }
    .callout.good{border-color:var(--green)}
    .callout.bad{border-color:var(--bad)}
    .callout.warn{border-color:var(--warn)}
    form{margin:0}
    ul{margin:0;padding-left:18px;color:var(--ink-soft)}
  </style>
</head>
<body>
  <main class="wrap">
    <div class="topbar">
      <div>
        <div class="stamp">Backend setup / account pipeline / Bluehost-ready PHP workspace</div>
      </div>
      <div class="actions">
        <a class="btn primary" href="./account.php">Open Account Workspace</a>
        <a class="btn" href="./app.html">Open Generator</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:12px;">
      <h1>Backend setup and demo account</h1>
      <p>This page initializes the database schema, ensures the storage folders exist, and seeds a sample user you can use to test the full account, preset, building-save, and download workflow immediately.</p>
      <?php if ($message !== ''): ?>
        <div class="callout good"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>
      <?php if ($error !== ''): ?>
        <div class="callout bad"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
      <?php else: ?>
        <div class="callout warn">After deployment to Bluehost, update <code>backend-config.php</code> if you want MySQL instead of the default SQLite file.</div>
      <?php endif; ?>
    </div>

    <div class="grid" style="margin-bottom:12px;">
      <section class="card">
        <h2>Runtime</h2>
        <div class="meta">
          <div><strong>Database driver:</strong><br><code><?= htmlspecialchars($dbDriver, ENT_QUOTES, 'UTF-8') ?></code></div>
          <div><strong>SQLite file:</strong><br><code><?= htmlspecialchars(database_path(), ENT_QUOTES, 'UTF-8') ?></code></div>
          <div><strong>Storage root:</strong><br><code><?= htmlspecialchars($storageRoot, ENT_QUOTES, 'UTF-8') ?></code></div>
          <div><strong>Base URL:</strong><br><code><?= htmlspecialchars(app_base_url(), ENT_QUOTES, 'UTF-8') ?></code></div>
        </div>
      </section>

      <section class="card">
        <h2>Sample user</h2>
        <p>Use this account to test sign-in, profile updates, preset saves, building saves, and export downloads end-to-end.</p>
        <?php if ($demoUser): ?>
          <div class="meta" style="margin-bottom:12px;">
            <div><strong>Email:</strong><br><code><?= htmlspecialchars((string) $demoUser['email'], ENT_QUOTES, 'UTF-8') ?></code></div>
            <div><strong>Password:</strong><br><code><?= htmlspecialchars((string) $demoUser['password'], ENT_QUOTES, 'UTF-8') ?></code></div>
          </div>
        <?php endif; ?>
        <form method="post">
          <input type="hidden" name="action" value="seed_demo">
          <button class="btn green" type="submit">Re-seed sample user</button>
        </form>
      </section>
    </div>

    <div class="grid">
      <section class="card">
        <h2>Data flow</h2>
        <ul>
          <li>Users and profile metadata live in the PDO database.</li>
          <li>Preset JSON files are written under <code>storage/users/user-{id}/presets/</code>.</li>
          <li>Saved building packages go under <code>storage/users/user-{id}/buildings/{timestamp}-{slug}/</code>.</li>
          <li>Each building package includes the GLB, GeoJSON export, config snapshot, and optional preset snapshot.</li>
        </ul>
      </section>

      <section class="card">
        <h2>Proof path</h2>
        <ul>
          <li>Open <a href="./account.php">account.php</a> and sign in with the sample user.</li>
          <li>Update the profile fields to confirm account customization is writable.</li>
          <li>Open <a href="./app.html">app.html</a>, generate a building, then use the new account save buttons.</li>
          <li>Return to the account workspace and download the saved GLB, preset JSON, GeoJSON, and config package artifacts.</li>
        </ul>
      </section>
    </div>
  </main>
</body>
</html>
