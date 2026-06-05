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
        "FRONTEND_URL": "https://academy-app-mu.vercel.app",
        "LEMON_SQUEEZY_API_KEY": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiI1NDU0ZjkxZTE1MTcwOTkxNjcxMWQ1OTEzOTUyN2M1OWI3YjY3NjgyZDZmOGIyMjMyYTk1Yzg0YzU2MzNiNjNiNWUxZmNhNzAyYjMyZThlYiIsImlhdCI6MTc4MDYwNTI1OS43NjY1NjcsIm5iZiI6MTc4MDYwNTI1OS43NjY1NjksImV4cCI6MTc5NjM0MjQwMC4wMzk4MTIsInN1YiI6IjczMjgxNTciLCJzY29wZXMiOltdfQ.6qZyWVOSAOMKTJ-HyvdX6OhgL-OK6RXRojKGXQZznIOYu859IqqXps1xDn1N1WUNqDJvCrBRCcpTbUZRny-gnph-ko9m2vynvh1zpuLeGxAGHWMKm8OmVkcq85ncX98Vsz5cUSRJUTwCL2zblcR-9Q-qsVYbIZ15xowEFOe48R4S0fJ86x7culSaoV0sEZT79ajoeyMuIQCy9QuJg6J5gy5PxalcOLmFkTvafHHq0ketkTGV08AptELT2ctecr_jCPN5-HkfJKmNpnFv0Ec-sGonI4VRXoP3rqj57nCgn6jsf0kPohrfa7YdD2MNlsXubjsexAD6-gW3mdl3BhT5rtkEiWlzW3EeYrgwkt-J9cXdKmfnDJ-_0YBFA0lMZNlf8Z1Hs_wqy8ibrU-qeuJrLuxiBT6qF6l1D8HKTI3bWh6vgYi63yt2LsPZof_hCznsKdBSRyCK0Ti3KRPADVX658xqn7BUTSTxXm-61urAlA6t6fBfdSz7mSnnlqodgcpH47-4xu4SWxEc-WMvvlzo6nLgOY6rXwS7sHVBqZEYl1i80aQzUeyu4-TPBiDSBJyL4AfD0vAwtFy6tjwtgIl9U03l_RfRvNCIrB0zjTqTWrYQtIs7vGcSczLLzoNv2iD_MibblSx2pLey432adht97YIDvmSxP4Tmux573Mg66P0",
        "LEMON_SQUEEZY_SIGNING_SECRET": "Amdh@963852741",
        "VAPID_PUBLIC_KEY": "BI04-ovK5PuGyPwVPTuTg3hqpAGgYpFxxrn-vAzUM3_v5_S1o07TDRErrhDh2MGkzkkUfYGFYcxx1WRLkWXLopY",
        "VAPID_PRIVATE_KEY": "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgQgO1EQuE3s8Uj5Gykx6_EHD4TUudbIKYi1NAr2k-9NShRANCAASNOPqLyuT7hsj8FT07k4N4aqQBoGKRcca5_rwM1DN_7-f0taNO0w0RK64Q4djBpM5JFH2BhWHMcdVkS5Fly6KW",
        "VAPID_CLAIMS_EMAIL": "mailto:admin@academy.com"
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

        # Create README.md with HF space metadata configuration
        readme_content = """---
title: Academy Backend
emoji: ⚽
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---
# Academy Backend
"""
        with open(os.path.join(tmp_dir, "README.md"), "w", encoding="utf-8") as f_readme:
            f_readme.write(readme_content)
        print("  [OK] Created README.md with Space metadata")

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
