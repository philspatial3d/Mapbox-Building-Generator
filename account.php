<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$demo = app_config()['demo_user'] ?? [];
$next = trim((string) ($_GET['next'] ?? './app.html'));
?>
<!doctype html>
<html lang="en">
<head>
<link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Account Workspace | Mapbox Building Generator</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

    :root {
      --bg: #e5eaf0;
      --paper: #f5f8fc;
      --panel: #eef3f7;
      --ink: #1a232d;
      --ink-soft: #536474;
      --line: #8fa0b1;
      --line-strong: #3c4d5e;
      --accent: #245f8e;
      --accent-green: #2f7158;
      --accent-warm: #9a5c2d;
      --accent-red: #9b4642;
      --shadow: 0 8px 0 rgba(60,77,94,.12), 0 12px 24px rgba(21,30,39,.14);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      color: var(--ink);
      font-family: "IBM Plex Sans", "Avenir Next", sans-serif;
      background:
        repeating-linear-gradient(0deg, rgba(60,77,94,.05) 0 1px, transparent 1px 34px),
        repeating-linear-gradient(90deg, rgba(60,77,94,.05) 0 1px, transparent 1px 34px),
        var(--bg);
      min-height: 100vh;
    }

    .shell {
      max-width: 1240px;
      margin: 0 auto;
      padding: 20px 16px 56px;
    }

    .topbar,
    .card {
      border: 2px solid var(--line-strong);
      background: rgba(245,248,252,.96);
      box-shadow: var(--shadow);
    }

    .topbar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 12px;
      margin-bottom: 14px;
    }

    .stamp {
      font: 700 12px/1.2 "IBM Plex Mono", monospace;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--ink-soft);
    }

    .nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .btn,
    button,
    input,
    textarea,
    select {
      font: 600 14px/1.25 "IBM Plex Sans", "Avenir Next", sans-serif;
    }

    .btn,
    button {
      appearance: none;
      border: 2px solid var(--line-strong);
      background: #fff;
      color: var(--ink);
      text-decoration: none;
      padding: 10px 14px;
      cursor: pointer;
    }

    .btn.primary,
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    .btn.green,
    button.green {
      background: var(--accent-green);
      border-color: var(--accent-green);
      color: #fff;
    }

    .btn.warm,
    button.warm {
      background: var(--accent-warm);
      border-color: var(--accent-warm);
      color: #fff;
    }

    button.danger {
      background: var(--accent-red);
      border-color: var(--accent-red);
      color: #fff;
    }

    h1,
    h2,
    h3 {
      margin: 0 0 10px;
      font-family: "Source Serif 4", serif;
      line-height: 1.08;
    }

    h1 { font-size: clamp(2.1rem, 5vw, 4rem); }
    h2 { font-size: clamp(1.35rem, 2.4vw, 2rem); }
    h3 { font-size: 1.05rem; }

    p {
      margin: 0 0 12px;
      color: var(--ink-soft);
      line-height: 1.55;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(320px, .85fr);
      gap: 12px;
      margin-bottom: 12px;
    }

    .card {
      padding: 18px;
    }

    .eyebrow {
      margin-bottom: 10px;
      font: 700 12px/1.2 "IBM Plex Mono", monospace;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--ink-soft);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .stack {
      display: grid;
      gap: 12px;
    }

    .auth-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--ink);
      font-weight: 600;
    }

    input,
    textarea,
    select {
      width: 100%;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      padding: 10px 12px;
      min-height: 42px;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
    }

    .status {
      min-height: 22px;
      margin-top: 8px;
      color: var(--ink-soft);
      font-size: 13px;
    }

    .status.error { color: var(--accent-red); }
    .status.success { color: var(--accent-green); }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .summary-item {
      padding: 12px;
      border: 1px solid var(--line);
      background: var(--panel);
    }

    .summary-item strong {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--ink-soft);
    }

    .summary-item span {
      display: block;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--ink);
    }

    .list {
      display: grid;
      gap: 10px;
    }

    .list-item {
      padding: 14px;
      border: 1px solid var(--line);
      background: #fff;
      display: grid;
      gap: 8px;
    }

    .list-item strong {
      font-size: 1rem;
    }

    .small {
      font-size: 13px;
      color: var(--ink-soft);
    }

    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .link-row a {
      color: var(--accent);
      font-weight: 700;
      text-decoration: none;
    }

    .mono {
      font-family: "IBM Plex Mono", monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 960px) {
      .topbar,
      .hero,
      .grid,
      .auth-grid,
      .field-grid {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <div class="stamp">Account workspace / presets / export packages</div>
      </div>
      <div class="nav">
        <a class="btn primary" href="./app.html">Open Generator</a>
        <a class="btn" href="./setup.php">Setup</a>
        <a class="btn" href="<?= htmlspecialchars($next, ENT_QUOTES, 'UTF-8') ?>">Return Path</a>
      </div>
    </header>

    <section class="hero">
      <div class="card">
        <div class="eyebrow">Production workspace</div>
        <h1>Accounts, presets, and export packages</h1>
        <p>This workspace handles account creation, sign-in, profile customization, and persistence for generator outputs. Presets are stored as reusable JSON design kits and full building saves are stored as GLB + GeoJSON + config snapshots under each user folder.</p>
        <div class="summary-grid">
          <div class="summary-item">
            <strong>Access control</strong>
            <span>Email + password</span>
          </div>
          <div class="summary-item">
            <strong>Preset memory</strong>
            <span>Reusable JSON kits</span>
          </div>
          <div class="summary-item">
            <strong>Asset packaging</strong>
            <span>GLB + GeoJSON bundles</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="eyebrow">Sample user</div>
        <h2>Immediate QA access</h2>
        <p>Use the demo account to validate sign-in, preset storage, building packaging, and file downloads without manual setup.</p>
        <div class="stack">
          <div class="summary-item">
            <strong>Email</strong>
            <span class="mono"><?= htmlspecialchars((string) ($demo['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <div class="summary-item">
            <strong>Password</strong>
            <span class="mono"><?= htmlspecialchars((string) ($demo['password'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span>
          </div>
          <button id="demoLogin" class="green" type="button">Use demo account</button>
          <div id="authStatus" class="status">Checking session…</div>
        </div>
      </div>
    </section>

    <section class="grid" style="margin-bottom:12px;">
      <div class="card">
        <div class="eyebrow">Authentication</div>
        <div id="authForms" class="auth-grid">
          <form id="loginForm" class="stack">
            <h2>Sign in</h2>
            <label>Email
              <input type="email" name="email" placeholder="name@studio.com" required>
            </label>
            <label>Password
              <input type="password" name="password" placeholder="Password" required>
            </label>
            <button class="primary" type="submit">Sign in</button>
          </form>

          <form id="registerForm" class="stack">
            <h2>Create account</h2>
            <label>Full name
              <input type="text" name="full_name" placeholder="Jane Architect">
            </label>
            <label>Email
              <input type="email" name="email" placeholder="name@studio.com" required>
            </label>
            <label>Password
              <input type="password" name="password" placeholder="Minimum 8 characters" required>
            </label>
            <button class="warm" type="submit">Create account</button>
          </form>
        </div>

        <div id="signedInPanel" class="stack hidden">
          <h2>Signed in</h2>
          <p id="signedInSummary">Session active.</p>
          <div class="link-row">
            <a href="./app.html">Open generator</a>
            <a href="./setup.php">Open setup page</a>
          </div>
          <button id="logoutButton" class="danger" type="button">Sign out</button>
        </div>
      </div>

      <div class="card">
        <div class="eyebrow">Storage map</div>
        <h2>Where the data goes</h2>
        <div class="stack small">
          <div><strong>Profiles:</strong> database tables `users` + `user_profiles`.</div>
          <div><strong>Presets:</strong> <span id="presetFolder" class="mono">storage/users/user-{id}/presets</span></div>
          <div><strong>Buildings:</strong> <span id="buildingFolder" class="mono">storage/users/user-{id}/buildings</span></div>
          <div><strong>Bluehost switch:</strong> edit `backend-config.php` to move from the local SQLite path to MySQL credentials.</div>
        </div>
      </div>
    </section>

    <section id="workspaceShell" class="stack hidden">
      <div class="card">
        <div class="eyebrow">Profile customization</div>
        <form id="profileForm" class="stack">
          <div class="field-grid">
            <label>Full name
              <input type="text" name="full_name">
            </label>
            <label>Studio name
              <input type="text" name="studio_name">
            </label>
            <label>Role title
              <input type="text" name="role_title">
            </label>
            <label>Timezone
              <input type="text" name="timezone">
            </label>
            <label>Accent color
              <input type="color" name="accent_color">
            </label>
            <label>Default export format
              <select name="default_export_format">
                <option value="glb">GLB</option>
                <option value="usdz">USDZ</option>
                <option value="gltf">GLTF</option>
                <option value="obj">OBJ</option>
                <option value="stl">STL</option>
              </select>
            </label>
          </div>
          <label>Mapbox public token
            <input type="text" name="mapbox_public_token" placeholder="Optional per-user token storage">
          </label>
          <label>Notes
            <textarea name="notes" placeholder="Custom studio defaults, handoff notes, billing notes, or deployment reminders"></textarea>
          </label>
          <button class="primary" type="submit">Save profile</button>
          <div id="profileStatus" class="status"></div>
        </form>
      </div>

      <div class="grid">
        <section class="card">
          <div class="eyebrow">Saved presets</div>
          <h2>Reusable preset library</h2>
          <p>Each save from the generator writes a versioned preset JSON file into the user preset folder and adds a metadata row in the database.</p>
          <div id="presetList" class="list"></div>
        </section>

        <section class="card">
          <div class="eyebrow">Saved buildings</div>
          <h2>Export package library</h2>
          <p>Each building save captures the GLB export plus the styled GeoJSON and current config snapshot so the asset can be reopened, reviewed, or handed off later.</p>
          <div id="buildingList" class="list"></div>
        </section>
      </div>
    </section>
  </main>

  <script>
    const nextHref = <?= json_encode($next, JSON_UNESCAPED_SLASHES) ?>;
    const authStatus = document.getElementById('authStatus');
    const authForms = document.getElementById('authForms');
    const signedInPanel = document.getElementById('signedInPanel');
    const signedInSummary = document.getElementById('signedInSummary');
    const workspaceShell = document.getElementById('workspaceShell');
    const presetFolder = document.getElementById('presetFolder');
    const buildingFolder = document.getElementById('buildingFolder');
    const profileForm = document.getElementById('profileForm');
    const profileStatus = document.getElementById('profileStatus');
    const presetList = document.getElementById('presetList');
    const buildingList = document.getElementById('buildingList');

    async function requestJson(url, options = {}) {
      const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.ok === false) {
        const message = data && data.error ? data.error : `Request failed (${response.status})`;
        throw new Error(message);
      }
      return data;
    }

    function setStatus(el, text, type = '') {
      el.textContent = text;
      el.className = `status${type ? ' ' + type : ''}`;
    }

    function renderPresets(items) {
      if (!items.length) {
        presetList.innerHTML = '<div class="list-item"><strong>No presets saved yet.</strong><div class="small">Open the generator, click a parcel, then use "Save preset to account".</div></div>';
        return;
      }
      presetList.innerHTML = items.map(item => `
        <article class="list-item">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="small">Saved: ${escapeHtml(item.created_at || '')}</div>
          <div class="small mono">${escapeHtml(item.preset_path || '')}</div>
          <div class="link-row">
            <a href="${item.open_url}">Open in generator</a>
            <a href="${item.download_url}">Download JSON</a>
          </div>
        </article>
      `).join('');
    }

    function renderBuildings(items) {
      if (!items.length) {
        buildingList.innerHTML = '<div class="list-item"><strong>No buildings saved yet.</strong><div class="small">Generate a building in the app and use "Save building to account".</div></div>';
        return;
      }
      buildingList.innerHTML = items.map(item => `
        <article class="list-item">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="small">Saved: ${escapeHtml(item.created_at || '')}</div>
          <div class="small">GLB size: ${formatBytes(item.glb_size || 0)}</div>
          <div class="small mono">${escapeHtml(item.paths && item.paths.glb ? item.paths.glb : '')}</div>
          <div class="link-row">
            <a href="${item.downloads.glb}">Download GLB</a>
            <a href="${item.downloads.geojson}">Download GeoJSON</a>
            <a href="${item.downloads.config}">Download config JSON</a>
            ${item.paths && item.paths.preset ? `<a href="${item.downloads.preset}">Download preset JSON</a>` : ''}
          </div>
        </article>
      `).join('');
    }

    function renderWorkspace(data) {
      const profile = data.profile || {};
      const user = data.user || {};
      authForms.classList.add('hidden');
      signedInPanel.classList.remove('hidden');
      workspaceShell.classList.remove('hidden');
      signedInSummary.textContent = `${profile.full_name || user.email || 'Signed in'} · ${profile.studio_name || 'No studio set'} · default export ${profile.default_export_format || 'glb'}`;
      presetFolder.textContent = data.storage ? data.storage.preset_folder : 'storage/users/user-{id}/presets';
      buildingFolder.textContent = data.storage ? data.storage.building_folder : 'storage/users/user-{id}/buildings';
      profileForm.full_name.value = profile.full_name || '';
      profileForm.studio_name.value = profile.studio_name || '';
      profileForm.role_title.value = profile.role_title || '';
      profileForm.timezone.value = profile.timezone || '';
      profileForm.accent_color.value = profile.accent_color || '#245f8e';
      profileForm.default_export_format.value = profile.default_export_format || 'glb';
      profileForm.mapbox_public_token.value = profile.mapbox_public_token || '';
      profileForm.notes.value = profile.notes || '';
    }

    function clearWorkspace() {
      authForms.classList.remove('hidden');
      signedInPanel.classList.add('hidden');
      workspaceShell.classList.add('hidden');
      presetList.innerHTML = '';
      buildingList.innerHTML = '';
      presetFolder.textContent = 'storage/users/user-{id}/presets';
      buildingFolder.textContent = 'storage/users/user-{id}/buildings';
    }

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[ch]);
    }

    function formatBytes(value) {
      const bytes = Number(value) || 0;
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    async function refreshWorkspace() {
      try {
        const auth = await requestJson('./api/auth.php');
        if (!auth.authenticated || !auth.user) {
          clearWorkspace();
          setStatus(authStatus, 'No active session. Sign in, register, or use the demo account.');
          return;
        }
        renderWorkspace(auth.user);
        setStatus(authStatus, `Signed in as ${auth.user.user.email}`, 'success');
        const [presets, buildings] = await Promise.all([
          requestJson('./api/presets.php'),
          requestJson('./api/buildings.php')
        ]);
        renderPresets(presets.items || []);
        renderBuildings(buildings.items || []);
      } catch (error) {
        clearWorkspace();
        setStatus(authStatus, error.message, 'error');
      }
    }

    document.getElementById('demoLogin').addEventListener('click', async () => {
      try {
        setStatus(authStatus, 'Signing in with the demo account…');
        await requestJson('./api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'demo_login' })
        });
        await refreshWorkspace();
      } catch (error) {
        setStatus(authStatus, error.message, 'error');
      }
    });

    document.getElementById('loginForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        setStatus(authStatus, 'Signing in…');
        await requestJson('./api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            email: form.get('email'),
            password: form.get('password')
          })
        });
        event.currentTarget.reset();
        await refreshWorkspace();
      } catch (error) {
        setStatus(authStatus, error.message, 'error');
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        setStatus(authStatus, 'Creating account…');
        await requestJson('./api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register',
            full_name: form.get('full_name'),
            email: form.get('email'),
            password: form.get('password')
          })
        });
        event.currentTarget.reset();
        await refreshWorkspace();
      } catch (error) {
        setStatus(authStatus, error.message, 'error');
      }
    });

    document.getElementById('logoutButton').addEventListener('click', async () => {
      try {
        await requestJson('./api/auth.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' })
        });
        setStatus(authStatus, 'Signed out.');
        clearWorkspace();
      } catch (error) {
        setStatus(authStatus, error.message, 'error');
      }
    });

    profileForm.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        setStatus(profileStatus, 'Saving profile…');
        await requestJson('./api/profile.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: form.get('full_name'),
            studio_name: form.get('studio_name'),
            role_title: form.get('role_title'),
            timezone: form.get('timezone'),
            accent_color: form.get('accent_color'),
            default_export_format: form.get('default_export_format'),
            mapbox_public_token: form.get('mapbox_public_token'),
            notes: form.get('notes')
          })
        });
        setStatus(profileStatus, 'Profile saved.', 'success');
        await refreshWorkspace();
      } catch (error) {
        setStatus(profileStatus, error.message, 'error');
      }
    });

    refreshWorkspace();
  </script>
</body>
</html>
