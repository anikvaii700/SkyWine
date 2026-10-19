import os
import shutil
import zipfile

ROOT_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
ASSETS_WWW = os.path.join(ROOT_DIR, "android", "app", "src", "main", "assets", "www")
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
ANDROID_DIR = os.path.join(ROOT_DIR, "android")

def copy_dist_to_android():
    print("[1/3] Copying dist to android assets...")
    if os.path.exists(DIST_DIR):
        if os.path.exists(ASSETS_WWW):
            shutil.rmtree(ASSETS_WWW)
        os.makedirs(os.path.dirname(ASSETS_WWW), exist_ok=True)
        shutil.copytree(DIST_DIR, ASSETS_WWW)
        print("  Copied dist to android/app/src/main/assets/www")
    else:
        print("  Warning: dist not found. Run npm run build first.")

def zip_directory(folder_path, output_zip_path, root_folder_name=None):
    print(f"  Zipping {folder_path} -> {output_zip_path}...")
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, folder_path)
                if root_folder_name:
                    arcname = os.path.join(root_folder_name, rel_path)
                else:
                    arcname = rel_path
                zipf.write(file_path, arcname)

def create_android_studio_zip():
    print("[2/3] Creating Android Studio ZIP...")
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    out_zip = os.path.join(PUBLIC_DIR, "aviator-android-studio-project.zip")
    zip_directory(ANDROID_DIR, out_zip, root_folder_name="Aviator-Android-Studio")
    print(f"  Done: {out_zip} ({os.path.getsize(out_zip)} bytes)")

def create_full_source_zip():
    print("[3/3] Creating Full Source Code ZIP...")
    out_zip = os.path.join(PUBLIC_DIR, "aviator-full-source-code.zip")
    exclude_dirs = {'.git', 'node_modules', '.cache', 'dev-dist'}
    with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                if file.endswith('.zip') or file.endswith('.tmp'):
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, ROOT_DIR)
                arcname = os.path.join("aviator-full-source", rel_path)
                zipf.write(file_path, arcname)
    print(f"  Done: {out_zip} ({os.path.getsize(out_zip)} bytes)")

if __name__ == '__main__':
    copy_dist_to_android()
    create_android_studio_zip()
    create_full_source_zip()
    print("All ZIPs generated successfully!")
