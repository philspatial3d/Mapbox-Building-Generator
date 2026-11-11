#!/usr/bin/env bash
# Download the seven openly licensed reference models (licences in docs/BENCHMARK.md) and
# extract each one's footprint, storeys, colours and a reference GLB.
# usage: PY=/path/to/venv/python scripts/benchmark/fetch_refs.sh   (venv: ifcopenshell shapely trimesh scipy)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${MBG_BENCH_WORK:-$HERE/../../output/benchmark}"
PY="${PY:-python3}"
BSI="https://media.githubusercontent.com/media/buildingsmart-community/Community-Sample-Test-Files/main"
KIT="https://www.ifcwiki.org/images"
mkdir -p "$WORK/refs" && cd "$WORK/refs"

dl() { mkdir -p "$1"; [ -s "$1/$2" ] || curl -fsSL -o "$1/$2" "$3"; }
enc() { "$PY" -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$1"; }

dl duplex duplex.ifc "$BSI/$(enc 'IFC 2.3.0.1 (IFC 2x3)/Duplex Apartment/Duplex_A_20110907.ifc')"
dl clinic clinic.ifc "$BSI/$(enc 'IFC 2.3.0.1 (IFC 2x3)/Medical-Dental Clinic/Clinic_Architectural.ifc')"
dl schependomlaan schependomlaan.ifc "$BSI/$(enc 'IFC 2.3.0.1 (IFC 2x3)/Schependomlaan/Design model IFC/IFC Schependomlaan.ifc')"
dl esplanades esplanades.ifc "$BSI/$(enc 'IFC 2.3.0.1 (IFC 2x3)/Esplanades/1807_EP_AR_v18.ifc')"
dl fzkhaus fzkhaus.ifc "$KIT/e/e3/AC20-FZK-Haus.ifc"
dl institute institute.ifc "$KIT/9/98/AC20-Institute-Var-2.ifc"
dl smiley smiley.zip "$KIT/c/c8/AC-20-Smiley-West-10-Bldg.zip"
[ -s smiley/AC-20-Smiley-West-10-Bldg.ifc ] || (cd smiley && unzip -oqj smiley.zip '*.ifc')

for c in duplex clinic esplanades fzkhaus institute smiley; do
  "$PY" -I "$HERE/extract_ref.py" "$(ls "$c"/*.ifc | head -1)" "$c/summary.json" "$c/reference.glb"
done
# Schependomlaan's layered walls only close into an outline with their openings.
"$PY" -I "$HERE/extract_ref.py" schependomlaan/schependomlaan.ifc schependomlaan/summary.json schependomlaan/reference.glb \
  --fp-classes IfcWall,IfcWallStandardCase,IfcCurtainWall,IfcColumn,IfcWindow,IfcDoor --close 0.8
echo "References ready in $WORK/refs"
