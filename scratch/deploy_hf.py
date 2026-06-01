import os
import sys
import tempfile
import shutil
from huggingface_hub import HfApi

# Files and folders to upload (only what's needed to run the app)
INCLUDE_FILES = [
    "main.py",
    "requirements.txt",
    "Dockerfile",
]

INCLUDE_DIRS = [
    "core",
    "routers",
    "schemas",
    "services",
    "models",
]

def deploy(token):
    api = HfApi(token=token)

    # 1. Verify credentials
    print("Checking Hugging Face credentials...")
    try:
        user_info = api.whoami()
        username = user_info["name"]
        print(f"Authenticated as: {username}")
    except Exception as e:
        print(f"Authentication failed: {e}")
        return

    repo_id = f"{username}/academy-backend"
    print(f"Target Space: {repo_id}")

    # 2. Create Space repository
    print("\nCreating Hugging Face Space (Docker)...")
    try:
        api.create_repo(
            repo_id=repo_id,
            repo_type="space",
            space_sdk="docker",
            private=False,
            exist_ok=True
        )
        print("Space created or already exists.")
    except Exception as e:
        print(f"Failed to create repository: {e}")
        return

    # 3. Add environment secrets
    secrets = {
        "SUPABASE_URL": "https://kbhnqntteexatihidhkn.supabase.co",
        "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0OTYwOSwiZXhwIjoyMDg4MzI1NjA5fQ.3n5lrv0GNtHPBOzll8PvJlCXczzA1kKRJuNDTmW1aCE",
        "PAYPAL_CLIENT_ID": "AerzCxryxpUVSenyl_Cx88JOXurXHwiu0J3DasFx-JzfT8U14IrpwV59Y2pTYVrJP8HyzrG0nfdx6Vys",
        "PAYPAL_CLIENT_SECRET": "ED2yeCsQnvn9YGlKg6BJj7XeDyGdwfvM72I9El5-Iy-E41Glsq3gODY3Q32WMxHfFZtGOszNicK71ySJ",
        "PAYPAL_SANDBOX": "true",
        "DEV_MODE": "false",
        "ENCRYPTION_KEY": "ZvtLzFP5EhtfdwW-wlSFx22TONj5l4bSz2gt6FB5aRs=",
        "FRONTEND_URL": "https://academy-app-mu.vercel.app"
    }

    print("\nSetting environment secrets...")
    for key, value in secrets.items():
        try:
            api.add_space_secret(repo_id=repo_id, key=key, value=value)
            print(f"  [OK] {key}")
        except Exception as e:
            print(f"  [FAIL] {key}: {e}")

    # 4. Copy only necessary files to a temp folder and upload
    backend_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
    tmp_dir = tempfile.mkdtemp(prefix="hf_deploy_")

    try:
        print(f"\nPreparing files for upload (temp dir: {tmp_dir})...")

        # Copy individual files
        for f in INCLUDE_FILES:
            src = os.path.join(backend_folder, f)
            if os.path.isfile(src):
                shutil.copy2(src, os.path.join(tmp_dir, f))
                print(f"  [OK] {f}")
            else:
                print(f"  [FAIL] {f} (not found)")

        # Copy directories
        for d in INCLUDE_DIRS:
            src = os.path.join(backend_folder, d)
            if os.path.isdir(src):
                shutil.copytree(src, os.path.join(tmp_dir, d),
                                ignore=shutil.ignore_patterns("*.pyc", "__pycache__"))
                print(f"  [OK] {d}/")
            else:
                print(f"  [FAIL] {d}/ (not found, skipping)")

        # Count files to upload
        total_files = sum(len(files) for _, _, files in os.walk(tmp_dir))
        print(f"\nUploading {total_files} files to Hugging Face Space...")

        api.upload_folder(
            folder_path=tmp_dir,
            repo_id=repo_id,
            repo_type="space",
        )

        print("\n=== Upload complete! ===")
        print(f"\nSpace Repo:  https://huggingface.co/spaces/{repo_id}")
        print(f"App API URL: https://{username.replace('.', '-')}-academy-backend.hf.space")
        print("\nHugging Face is building your Docker image now. It will be live in ~2-3 minutes.")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy_hf.py <HF_TOKEN>")
    else:
        deploy(sys.argv[1])
