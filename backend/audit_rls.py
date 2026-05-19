import os
import re

ROUTERS_DIR = "routers"
API_METHODS = ["get", "post", "patch", "delete", "put"]

def audit():
    vulnerable_endpoints = []
    
    for filename in os.listdir(ROUTERS_DIR):
        if not filename.endswith(".py"):
            continue
            
        filepath = os.path.join(ROUTERS_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines):
            # Find client.get, client.patch, etc.
            if any(f"client.{m}(" in line for m in API_METHODS) or any(f"supabase._get(" in line for m in API_METHODS):
                # The actual URL might be on the next line if formatted
                url_line = line
                for j in range(0, 4):
                    if i + j < len(lines):
                        url_line += lines[i+j]
                
                # Check if it queries a table (v1/something)
                if "/rest/v1/" in url_line:
                    # Ignore tables that don't need academy_id like saas_settings, users (sometimes), etc.
                    if "saas_settings" in url_line or "academy_settings" in url_line or "academies" in url_line:
                        continue
                        
                    # Does it have an academy_id filter?
                    if "academy_id" not in url_line:
                        vulnerable_endpoints.append(f"{filename}:{i+1} -> {line.strip()}")
                        
    print("Found potential missing academy_id filters in the following lines:")
    for v in vulnerable_endpoints:
        print(v)
        
if __name__ == "__main__":
    audit()
