"""Gera projetos Android/iOS no diretório informado, sem alterar o código web."""
import argparse
import plistlib
import shutil
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("destino",type=Path)
parser.add_argument("--org",required=True,help="Prefixo reverso controlado pelo titular da conta")
parser.add_argument("--projeto",required=True,help="Nome estável, como smartstock")
parser.add_argument("--nome",required=True)
args=parser.parse_args()
dest=args.destino.resolve()
if dest.exists():
    parser.error("Escolha um diretório novo.")
root=Path(__file__).resolve().parent
subprocess.run(["flutter","create","--platforms=android,ios","--org",args.org,"--project-name",args.projeto,str(dest)],check=True)
shutil.copy(root/"lib/main.dart",dest/"lib/main.dart")
(dest/"pubspec.yaml").write_text((root/"pubspec.yaml").read_text().replace("name: smartstock_mobile","name: "+args.projeto))
manifest=dest/"android/app/src/main/AndroidManifest.xml"
ns="http://schemas.android.com/apk/res/android"
ET.register_namespace("android",ns)
tree=ET.parse(manifest)
tree.getroot().find("application").set("{"+ns+"}label",args.nome)
for permission in ["INTERNET","CAMERA"]:
    ET.SubElement(tree.getroot(),"uses-permission",{"{"+ns+"}name":"android.permission."+permission})
ET.SubElement(tree.getroot(),"uses-feature",{"{"+ns+"}name":"android.hardware.camera","{"+ns+"}required":"false"})
tree.write(manifest,encoding="utf-8",xml_declaration=True)
plist=dest/"ios/Runner/Info.plist"
data=plistlib.loads(plist.read_bytes())
data.update(CFBundleDisplayName=args.nome,NSCameraUsageDescription="Ler o código de um material para pesquisar no estoque.")
plist.write_bytes(plistlib.dumps(data))
subprocess.run(["flutter","pub","get"],cwd=dest,check=True)
