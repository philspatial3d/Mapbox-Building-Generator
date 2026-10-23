# Bluehost deployment — BG-090/091

The generator is `app.html`; `index.html` is the landing page. There is no build step.
The upload package is `output/mapbox-building-generator-bluehost.zip`.

## Files to upload

Extract the ZIP contents together into a dedicated directory under your site's document root,
for example `public_html/building-generator/`. Keep this structure:

```text
index.html
app.html
ar.html
native-ar.html
sw-ar-assets.js
favicon.svg
mapbox-config.js            # public browser token; included in ZIP, ignored by Git
mapbox-config.example.js    # template for future checkouts
account.html
account.php
backend-config.php
setup.php
qgis-plugin.html
js/                         # textures.js and all texture PNGs
presets/defaults.json        # current 37-preset library
api/                        # all PHP endpoint and bootstrap files
storage/.htaccess           # blocks direct downloads of private data
storage/database/.gitkeep
storage/users/.gitkeep
landing/                    # linked landing concepts and SVG assets
```

The ZIP also contains this deployment guide. Do not upload `.git/`, local databases,
saved user packages, `agency/`, `scripts/`, `haunted_ar/`, or `vercel.json` for this release.
The separate folklore camera is unrelated to the building generator.

## First deployment

1. Back up any existing site files. Create a dedicated app folder so the upload does not
   replace a WordPress homepage or its `.htaccess`.
2. **Before uploading, password-protect the whole app folder with Bluehost Directory Privacy.**
   The existing account backend exposes a shared demo login, and `setup.php` displays its
   credentials. This package is intended for your private testing. Changing the demo password
   alone does not disable the demo login. A public account-service launch needs separate hardening.
3. Upload and extract the ZIP using File Manager. Enable hidden-file display and confirm that
   `storage/.htaccess` was extracted. Delete the uploaded ZIP after extraction.
4. Use a PHP-enabled hosting configuration with PDO. The default database is SQLite and needs
   PDO SQLite plus write access for PHP to `storage/database/` and `storage/users/`.
   If SQLite is unavailable, create a MySQL database/user, grant access, and edit the server's
   `backend-config.php`: set `database.driver` to `mysql` and enter the MySQL credentials.
   Keep real database credentials out of Git.
5. Visit `https://YOUR-DOMAIN/building-generator/setup.php` once, check that setup succeeds,
   then remove `setup.php` from the hosted copy. Never replace an existing production database
   or `storage/users/` when updating. Keep your existing server-specific backend and Mapbox token configuration.
6. Open `https://YOUR-DOMAIN/building-generator/app.html`. Use HTTPS, including for camera and
   location permissions in the AR viewer. Dependencies load from external CDNs, so internet
   access is required. The Mapbox public token is in `mapbox-config.js` (included in this ZIP); ensure its allowed URLs include
   your actual hosting URL if restrictions are configured. If deploying from a fresh Git checkout, copy
   `mapbox-config.example.js` to `mapbox-config.js` and enter your own public `pk.` token first.
   Never put a secret `sk.` token into browser code.

## Using it in your neighbourhood

1. Search for your address or a nearby landmark in **Search address or site**. The first visit
   starts in New York; the app remembers your camera position after use.
2. Zoom in and click a visible building footprint. Choose a preset and regenerate as needed.
   If a footprint is missing from the basemap, upload a WGS84 GeoJSON Polygon/MultiPolygon
   (longitude, latitude; maximum 1 MB).
3. Download GeoJSON or export the 3D model. Account saves additionally need the PHP/database
   setup above. For several sites, enable multi-building mode (maximum five).
4. On your phone, open the same HTTPS address. Open the editor menu when needed, then launch
   the AR viewer from the generated building. Allow camera/location/motion access when prompted.
   Tracking quality still requires a real-phone check: sensor fallback does not establish a
   persistent world anchor while walking. The native handoff page does not install a native app.

## Updating an existing installation

Replace `app.html`, `ar.html`, `index.html`, `js/`, and `presets/defaults.json` together; also
upload the supporting files above if missing. Preserve the hosted `backend-config.php`, existing
`storage/database/`, `storage/users/`, and any host-created directory authentication settings.
Reload with cache cleared after upload. A Git push does not update Bluehost automatically.

## Verification

Local release checks: geometry/fidelity checks (six scenarios, 37 presets), AR contract checks,
PHP syntax checks, and isolated account save/download smoke checks passed. Browser checks and
remaining limitations are recorded under BG-092 in `codex/TASKS.md`. No Bluehost deployment or
physical-phone AR validation is implied by these local checks.

Bluehost references:
- [Directory Privacy](https://www.bluehost.com/help/article/am-directory-privacy)
- [File Manager and document root](https://www.bluehost.com/help/article/am-website-files-and-access-tab)
