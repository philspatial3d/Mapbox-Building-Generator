# Camera (tapestry.media/haunted)

An ordinary-looking camera. A single figure, the Uncounted, is placed in the real street by compass, gyroscope and GPS. It changes only while the camera is pointed elsewhere.

## Files to deploy

Upload the whole folder and serve it over HTTPS (camera and motion sensors require it):

`index.html`, `main.js`, `director.js`, `uncounted.js`, `place.js`, `sound.js`, `favicon.svg`, `CREDITS.md`, `assets/uncounted.glb` (3.1 MB).

Do not upload `README.md`. Exit goes to `/` (`EXIT_URL` in `main.js`).

## How it behaves

| Part | What it does |
|---|---|
| `director.js` | Timing. Nothing appears for 80–170 s (60–150 s on return visits). Then a figure stands 20–38 m away, outside the current view, three-quarters turned away. Each time the viewer has looked at it and then away for 2 s or more, there may be a change: the first is usually the head turning toward the camera; later ones move it closer or farther, back to its first spot, or gone. Nothing changes while it is on screen. Rare and once-per-session: an edge glimpse during a fast pan, and a close encounter at 6–8 m. The final 5.5 m encounter can only happen on a return visit, after 12 minutes, and only once per device (`localStorage` key `camera.v1`). |
| `place.js` | Places the figure beside walls and on pavements, using OpenStreetMap buildings and roads from OpenFreeMap vector tiles. Never inside or behind a building, never in a roadway. Tiles are cached per ~100 m cell for 7 days. Offline, it falls back to directions the viewer has already looked at, without the occlusion check. Also computes the sun position used for lighting. |
| `uncounted.js` | The figure: Mike Alger's rigged model (see `CREDITS.md`), repainted, re-posed, 1.93 m tall, with a lengthened neck, a restructured face, a long coat, and jaw and muzzle morph targets. |
| `sound.js` | Three synthesised sounds, all near the threshold of hearing: air passing, teeth clicking, an exhale. Played at most every 4–8 minutes, never in step with a visual change. |
| `main.js` | Camera feed, sensors, lighting matched to the camera image (ambient colour, and sun only when the ground shows hard shadows or the sky is blue), shutter, and close sheet. |

## Debug (desktop testing only)

`index.html?debug=1&still=/path/to/street.jpg` replaces the camera with a still image and shows a small status readout.

- Arrow keys look around.
- `heading=`, `pitch=`, `fov=` set the camera.
- `speed=30` speeds up the scheduler.
- `force=far|turned|near|final|transform|face` with `dist=` and `offset=` places the figure for compositing checks.

Debug mode never requests location, so placement uses the fallback.

## Limits

- **No real occlusion:** a car or pedestrian passing in front of the figure does not hide it. Buildings are handled by never placing it behind one.
- **Rotation tracking only:** the phone's rotation is tracked, not its position. Walking is followed through GPS once the viewer has moved more than 15 m, and only while the figure is off screen.
- **Approximate field of view:** it assumes about 66° across the long side of the camera image; individual phones differ slightly.
