# Bluehost deployment — BG-093 interior review update

## Latest update: exact replacement files

The BG-093 branch is a local review build. It has not been pushed or deployed, and
phone/visual release checks remain open in `INTERIOR_IMMERSION_REVIEW.md`.
The older `output/mapbox-building-generator-bluehost.zip` **does not include BG-093**.

For the installation at `https://tapestry.media/building-generator/app.html`, back up
the existing files, then upload these paths together under `public_html/building-generator/`:

```text
app.html                                      # replace
ar.html                                       # replace
js/interior/                                  # add every file, preserving paths
  architecture.js   ar-ui.css       contact.js
  elevator.js       floor-picker.js furniture.js
  interior.css      kitchen.js      lighting.js
  materials.js      permissions.js  planner.js
  planner.worker.js planner-runtime.js
  review.html       scene.js        seating.js   state.js
assets/interior/                              # add complete recursive model library
  manifest.json     README.md
  GothicBed_01/     dining_chair_02/  dining_table/
  modern_arm_chair_01/              modern_ceiling_lamp_01/
  modern_coffee_table_01/           potted_plant_01/  sofa_02/
  # Each model directory includes high.glb, low.glb and provenance/manifest JSON.
assets/interior-textures/                     # add all generated finish files
  plaster.webp      oak.webp        stone.webp   manifest.json
```

The new model/finish assets total about 5.3 MiB on disk. Preserve filename case,
especially `GothicBed_01`. The worker and its generated runtime must be uploaded
together; there is no build step on Bluehost. Keep existing `js/textures.js` and
texture PNGs, PHP/API files, `presets/defaults.json`, `mapbox-config.js`, authentication
settings, databases and user storage. The 37-preset JSON is unchanged in BG-093.
Do not overwrite the entire existing `js/` directory with only the new subdirectory.

**Never upload `.env`, `.env.*`, `.git/`, scripts, local evidence or local databases.**
The image API key was used only during texture generation. The hosted app needs no
image API key. The generated WebP files are ordinary static assets.

After upload, clear the browser cache, generate a fresh building in the editor and
launch AR again (old handoff payloads cannot acquire new room plans). Check the
floor picker, Controls panel, preview, room visit and return to map. On a phone,
use HTTPS and test camera/motion/location independently. These instructions identify
the required files; they do not claim that the current hosted site was updated.

## Existing BG-090/091 full installation package

The generator is `app.html`; `index.html` is the landing page. There is no build step.
The previous full installation package is `output/mapbox-building-generator-bluehost.zip`.

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
