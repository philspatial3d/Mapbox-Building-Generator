import urllib.request,json,concurrent.futures,subprocess,shutil,tempfile
from pathlib import Path

def main() -> None:
    ids=['sofa_02','modern_arm_chair_01','dining_chair_02','modern_coffee_table_01','dining_table','GothicBed_01','potted_plant_01','modern_ceiling_lamp_01']
    headers={'User-Agent':'MapboxBuildingGenerator/1.0 (local CC0 preparation)'}
    meta=json.load(urllib.request.urlopen(urllib.request.Request('https://api.polyhaven.com/assets?t=models',headers=headers)))
    root=Path(__file__).resolve().parents[1]
    cli=shutil.which('gltf-transform')
    if not cli: raise SystemExit('Install build tool @gltf-transform/cli@4.3.0 to prepare assets; not required to run the app.')
    cache=Path(tempfile.mkdtemp(prefix='mbg-interior-assets-'))
    def get(url: str) -> bytes:
     """Fetch a documented Poly Haven asset file with an identified client."""
     return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MapboxBuildingGenerator/1.0 (local CC0 preparation)'}),timeout=90).read()
    def build(asset: str) -> None:
     """Create centred meshopt GLBs and source provenance for one CC0 model."""
     p=cache/asset;p.mkdir(parents=True,exist_ok=True)
     files=json.loads(get('https://api.polyhaven.com/files/'+asset))['gltf']['1k']['gltf']
     (p/'source.gltf').write_bytes(get(files['url']))
     for name,info in files['include'].items():
      dest=p/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(get(info['url']))
     subprocess.run(['gltf-transform','center',str(p/'source.gltf'),str(p/'centered.glb'),'--pivot','below'],check=True,stdout=subprocess.DEVNULL)
     dest=root/'assets/interior'/asset;dest.mkdir(parents=True,exist_ok=True)
     for level,ratio,error,size in [('high',1,0.0001,1024),('low',0.12,0.06,1024)]:
      if asset=='GothicBed_01': ratio,error=(.75,.002) if level=='high' else (.05,1)
      if asset=='dining_chair_02': ratio,error=(.6,.002) if level=='high' else (.06,.1)
      if asset=='potted_plant_01': ratio,error=(.065,.02) if level=='high' else (.003,1)
      subprocess.run(['gltf-transform','optimize',str(p/'centered.glb'),str(dest/(level+'.glb')),'--compress','meshopt','--texture-compress','webp','--texture-size',str(size),'--simplify-ratio',str(ratio),'--simplify-error',str(error),'--palette','false','--instance','false'],check=True,stdout=subprocess.DEVNULL)
     (dest/'provenance.json').write_text(json.dumps({'id':asset,'source':'https://polyhaven.com/a/'+asset,'author':', '.join(meta[asset]['authors']),'licence':'CC0-1.0','redistribution':True,'units':'metres','up':'+Y','forward':'+Z','pivot':'floor-centre','textureSize':1024},indent=2)+'\n', encoding='utf-8')
     print('prepared',asset,flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
     list(pool.map(build,ids))

    subprocess.run(['node',str(root/'scripts/manifest_interior_assets.mjs'),str(Path(cli).resolve().parents[1])],cwd=root,check=True)
    shutil.rmtree(cache)

if __name__ == "__main__":
    main()
