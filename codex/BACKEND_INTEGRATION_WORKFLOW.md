# Backend Integration Workflow

## What was added

### Core backend
- `backend-config.php`
  - Single place to switch between local SQLite and Bluehost MySQL.
- `api/bootstrap.php`
  - Starts sessions, opens PDO, creates schema, manages storage paths, and seeds the demo user.
- `api/auth.php`
  - `GET` current session, `POST` login/register/logout/demo-login.
- `api/profile.php`
  - Reads and updates per-user customization fields.
- `api/presets.php`
  - Lists account presets, saves preset JSON, and returns a single preset for `app.html?preset_id=...`.
- `api/buildings.php`
  - Lists building packages and accepts multipart uploads containing GLB + JSON payloads.
- `api/download.php`
  - Authenticated download gateway for preset/building files.
- `setup.php`
  - Initializes the backend and re-seeds the sample user.

### Frontend integration
- `app.html`
  - Added account status panel.
  - Added `Save preset to account`.
  - Added `Save building to account`.
  - Added preset deep-link loading from `preset_id`.
- `account.php`
  - Real account workspace for auth, profile customization, preset list, and building list.
- `account.html`
  - Redirect shim to `account.php`.

### Storage and runtime protection
- `storage/.htaccess`
  - Blocks direct Apache access to private saved files.
- `.gitignore`
  - Keeps runtime SQLite and user-uploaded assets out of git.

## Data model

### Database tables
- `users`
  - email, password hash, timestamps.
- `user_profiles`
  - full name, studio, role, timezone, accent color, default export format, optional Mapbox token, notes.
- `presets`
  - metadata row for each saved preset JSON file.
- `buildings`
  - metadata row for each saved building package.

### Filesystem layout
- `storage/users/user-{id}/presets/{timestamp}-{slug}.json`
  - Exact preset JSON payload saved from `cfg()`.
- `storage/users/user-{id}/buildings/{timestamp}-{slug}/`
  - `{slug}.glb`
  - `{slug}.geojson`
  - `{slug}-config.json`
  - `{slug}-preset.json` when available

## Exact workflow

### 1. Setup
1. Start PHP from the repo root:
   - `php -S 127.0.0.1:8000`
2. Open `http://127.0.0.1:8000/setup.php`.
3. Setup ensures:
   - database file/folders exist,
   - schema exists,
   - demo user exists,
   - starter preset exists for the demo user.

### 2. Sign-on
1. Open `http://127.0.0.1:8000/account.php`.
2. Either:
   - click `Use demo account`, or
   - register with email + password.
3. Session state is stored in PHP sessions and exposed to `app.html` via `api/auth.php`.

### 3. User customization
1. In `account.php`, edit profile values.
2. Submit the form.
3. `api/profile.php` updates `user_profiles`.
4. `app.html` reads the session again and uses `default_export_format` to preselect the export format.

### 4. Save a preset
1. In `app.html`, generate or adjust a building configuration.
2. Click `Save preset to account`.
3. Frontend sends:
   - `schema`
   - `name`
   - `config` from `cfg()`
4. `api/presets.php`:
   - writes the JSON file into the user preset folder,
   - inserts a metadata row into `presets`.
5. `account.php` lists that preset and exposes:
   - download link
   - open-in-generator link

### 5. Save a building
1. In `app.html`, generate a building first.
2. Click `Save building to account`.
3. Frontend gathers:
   - GLB from `exportCurrentBuildingGlbBlob()`
   - styled GeoJSON from `buildStyledGeoJsonExport(...)`
   - config snapshot from `lastCfgSnapshot || cfg()`
   - preset snapshot
4. `api/buildings.php` writes the package folder and inserts a metadata row into `buildings`.
5. `account.php` lists that package with authenticated download links.

### 6. Reload a saved preset into the generator
1. Click `Open in generator` on a saved preset.
2. That opens `app.html?preset_id={id}`.
3. `app.html` calls `api/presets.php?id={id}`.
4. The returned config is pushed through `applyPresetConfig(...)`.

## Sample user
- Email: `demo@mapboxbuildinggenerator.local`
- Password: `DemoPass123!`

## Bluehost adaptation
1. Upload the project to Bluehost under a PHP-enabled site.
2. Create a MySQL database in Bluehost cPanel.
3. Edit `backend-config.php`:
   - set `database.driver` to `mysql`
   - fill in host, database, username, password
4. Keep `storage/` writable by PHP.
5. Open `setup.php` once on the live site to create schema and seed the demo account.

## Files added for this task
- `.gitignore`
- `account.php`
- `backend-config.php`
- `setup.php`
- `api/bootstrap.php`
- `api/auth.php`
- `api/profile.php`
- `api/presets.php`
- `api/buildings.php`
- `api/download.php`
- `storage/.htaccess`
- `storage/.gitkeep`
- `storage/database/.gitkeep`
- `storage/users/.gitkeep`

## Files modified for this task
- `app.html`
- `account.html`
- `index.html`
- `landing/index.html`
- `landing/landing-atlas.html`
- `landing/landing-control-desk.html`
- `landing/landing-structural.html`
- `landing/landing-material-ledger.html`
- `landing/landing-civic-fabric.html`
- `codex/TASKS.md`
