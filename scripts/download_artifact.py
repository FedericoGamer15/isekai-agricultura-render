"""Descarga y extracción ultra rápida multihilo de artefactos de GitHub Actions.

Uso:
    python scripts/download_artifact.py                  # Busca el artefacto final de la última corrida
    python scripts/download_artifact.py --run 41978245265 # Descarga el artefacto final de esa corrida específica
    python scripts/download_artifact.py --id 13393377047  # Descarga por ID directo de artefacto
"""

import argparse
import concurrent.futures
import json
import os
import subprocess
import urllib.error
import urllib.request
import zipfile

REPO = "FedericoGamer15/isekai-agricultura-render"
GH_CLI = r"C:\Program Files\GitHub CLI\gh.exe"


def get_gh_token() -> str:
    return subprocess.check_output([GH_CLI, "auth", "token"], text=True).strip()


class NoAuthRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Capturamos el 302 manualmente


def resolve_artifact_id(token: str, repo: str = REPO, run_id: str | None = None, name_filter: str | None = None) -> tuple[str, str]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Antigravity",
    }
    
    if run_id:
        url = f"https://api.github.com/repos/{repo}/actions/runs/{run_id}/artifacts"
    else:
        url = f"https://api.github.com/repos/{repo}/actions/artifacts?per_page=20"
        
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    artifacts = data.get("artifacts", [])
    if not artifacts:
        raise RuntimeError("No se encontraron artefactos disponibles.")
        
    # Priorizar artefactos finales
    for art in artifacts:
        name = art.get("name", "")
        if name_filter and name_filter in name:
            return str(art["id"]), name
        if "final" in name:
            return str(art["id"]), name
            
    # Si ninguno coincide con "final", tomar el primero
    return str(artifacts[0]["id"]), artifacts[0]["name"]


def download_artifact(artifact_id: str, out_dir: str = "out/", repo: str = REPO):
    token = get_gh_token()
    api_url = f"https://api.github.com/repos/{repo}/actions/artifacts/{artifact_id}/zip"
    
    req = urllib.request.Request(
        api_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "Antigravity",
        },
    )
    
    opener = urllib.request.build_opener(NoAuthRedirectHandler())
    signed_url = None
    try:
        opener.open(req)
    except urllib.error.HTTPError as e:
        if e.code == 302:
            signed_url = e.headers.get("Location")
            
    if not signed_url:
        raise RuntimeError("No se pudo obtener la URL firmada de descarga (Azure Blob).")
        
    print(f"URL firmada obtenida para artefacto {artifact_id}.")
    head_req = urllib.request.Request(signed_url, method="HEAD")
    with urllib.request.urlopen(head_req) as resp:
        total_len = int(resp.headers.get("Content-Length", 50 * 1024 * 1024))
        
    print(f"Tamaño total: {total_len} bytes (~{round(total_len / 1024 / 1024, 1)} MB). Descargando con 6 hilos...")
    
    num_threads = 6
    chunk_size = total_len // num_threads
    ranges = []
    for i in range(num_threads):
        start = i * chunk_size
        end = total_len - 1 if i == num_threads - 1 else (i + 1) * chunk_size - 1
        ranges.append((i, start, end))
        
    chunks = [None] * num_threads
    
    def download_range(idx: int, start: int, end: int):
        range_req = urllib.request.Request(signed_url, headers={"Range": f"bytes={start}-{end}"})
        with urllib.request.urlopen(range_req) as resp:
            return idx, resp.read()
            
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(download_range, idx, start, end) for idx, start, end in ranges]
        for f in concurrent.futures.as_completed(futures):
            idx, data = f.result()
            chunks[idx] = data
            
    zip_bytes = b"".join(chunks)
    zip_path = os.path.join(out_dir, "temp_artifact.zip")
    os.makedirs(out_dir, exist_ok=True)
    with open(zip_path, "wb") as f:
        f.write(zip_bytes)
        
    print("Descomprimiendo artefacto...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(out_dir)
        
    os.remove(zip_path)
    print(f"Artefacto extraído exitosamente en {out_dir}")


def main():
    parser = argparse.ArgumentParser(description="Descarga ultra rápida multihilo de artefactos GitHub")
    parser.add_argument("--id", help="ID del artefacto directo")
    parser.add_argument("--run", help="ID de la corrida (workflow run) de GitHub Actions")
    parser.add_argument("--repo", default=REPO, help="Repositorio propietario/nombre")
    parser.add_argument("--out", default="out/", help="Directorio destino de salida")
    parser.add_argument("--filter", help="Filtro por nombre de artefacto")
    args = parser.parse_args()
    
    token = get_gh_token()
    if args.id:
        art_id = args.id
        art_name = "direct"
    else:
        art_id, art_name = resolve_artifact_id(token, repo=args.repo, run_id=args.run, name_filter=args.filter)
        
    print(f"Descargando artefacto '{art_name}' (ID: {art_id}) desde {args.repo}...")
    download_artifact(art_id, out_dir=args.out, repo=args.repo)


if __name__ == "__main__":
    main()
