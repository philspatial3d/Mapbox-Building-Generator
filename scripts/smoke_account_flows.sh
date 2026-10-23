#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8136}"
BASE_URL="http://127.0.0.1:${PORT}"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

cd "${ROOT_DIR}"

php -S "127.0.0.1:${PORT}" -t "${ROOT_DIR}" >"${TMP_DIR}/php-server.log" 2>&1 &
SERVER_PID="$!"

for _ in $(seq 1 20); do
  if curl -fsS "${BASE_URL}/setup.php" >"${TMP_DIR}/setup.html" 2>/dev/null; then
    break
  fi
  sleep 1
done

curl -fsS "${BASE_URL}/setup.php" >"${TMP_DIR}/setup.html"
grep -q "Sample user" "${TMP_DIR}/setup.html"

COOKIE_JAR="${TMP_DIR}/cookies.txt"

curl -fsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -H 'Content-Type: application/json' \
  -d '{"action":"demo_login"}' \
  "${BASE_URL}/api/auth.php" > "${TMP_DIR}/auth.json"

php -r '
$data = json_decode(file_get_contents($argv[1]), true);
if (!is_array($data) || empty($data["ok"]) || empty($data["authenticated"]) && empty($data["user"])) {
    fwrite(STDERR, "Demo login failed\n");
    exit(1);
}
' "${TMP_DIR}/auth.json"

curl -fsS -c "${COOKIE_JAR}" -b "${COOKIE_JAR}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Parcel Preset","schema":1,"config":{"floors":12,"massing":"slab","skin":"glass"}}' \
  "${BASE_URL}/api/presets.php" > "${TMP_DIR}/preset-save.json"

PRESET_ID="$(php -r '$data=json_decode(file_get_contents($argv[1]), true); if (!isset($data["item"]["id"])) exit(1); echo $data["item"]["id"];' "${TMP_DIR}/preset-save.json")"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/download.php?entity=preset&id=${PRESET_ID}" > "${TMP_DIR}/preset.json"
grep -q 'Smoke Parcel Preset' "${TMP_DIR}/preset.json"

printf 'glTFsmoke' > "${TMP_DIR}/smoke.glb"

INVALID_STATUS="$(
  curl -s -o "${TMP_DIR}/invalid-building.json" -w "%{http_code}" \
    -b "${COOKIE_JAR}" \
    -F "name=Invalid Preset Building" \
    -F 'config_json={"floors":12,"massing":"slab"}' \
    -F 'geojson_json={"type":"FeatureCollection","features":[]}' \
    -F 'preset_json=not-json' \
    -F "glb_file=@${TMP_DIR}/smoke.glb;type=model/gltf-binary" \
    "${BASE_URL}/api/buildings.php"
)"; [[ "${INVALID_STATUS}" == "422" ]]
grep -q 'preset_json must be valid JSON if provided' "${TMP_DIR}/invalid-building.json"

curl -fsS -b "${COOKIE_JAR}" \
  -F "name=Smoke Tower" \
  -F 'config_json={"floors":12,"massing":"slab"}' \
  -F 'geojson_json={"type":"FeatureCollection","features":[]}' \
  -F 'preset_json={"name":"Smoke Parcel Preset","config":{"floors":12,"massing":"slab"}}' \
  -F "glb_file=@${TMP_DIR}/smoke.glb;type=model/gltf-binary" \
  "${BASE_URL}/api/buildings.php" > "${TMP_DIR}/building-save.json"

BUILDING_ID="$(php -r '$data=json_decode(file_get_contents($argv[1]), true); if (!isset($data["item"]["id"])) exit(1); echo $data["item"]["id"];' "${TMP_DIR}/building-save.json")"

curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/download.php?entity=building&id=${BUILDING_ID}&file=glb" > "${TMP_DIR}/building.glb"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/download.php?entity=building&id=${BUILDING_ID}&file=geojson" > "${TMP_DIR}/building.geojson"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/download.php?entity=building&id=${BUILDING_ID}&file=config" > "${TMP_DIR}/building-config.json"
curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/download.php?entity=building&id=${BUILDING_ID}&file=preset" > "${TMP_DIR}/building-preset.json"

[[ "$(head -c 4 "${TMP_DIR}/building.glb")" == "glTF" ]]
php -r '$data=json_decode(file_get_contents($argv[1]), true); if (($data["type"] ?? "") !== "FeatureCollection") exit(1);' "${TMP_DIR}/building.geojson"
php -r '$data=json_decode(file_get_contents($argv[1]), true); if (($data["floors"] ?? null) !== 12) exit(1);' "${TMP_DIR}/building-config.json"
php -r '$data=json_decode(file_get_contents($argv[1]), true); if (($data["name"] ?? "") !== "Smoke Parcel Preset") exit(1);' "${TMP_DIR}/building-preset.json"

curl -fsS -b "${COOKIE_JAR}" "${BASE_URL}/api/buildings.php" > "${TMP_DIR}/buildings-list.json"
grep -q 'Smoke Tower' "${TMP_DIR}/buildings-list.json"

echo "mapbox building generator smoke flow passed"
