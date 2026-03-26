import os
import re

def get_relative_path_to_config(file_path):
    # Calculates the relative path from the current file to src/config.js
    parts = os.path.normpath(file_path).split(os.sep)
    try:
        src_index = parts.index('src')
        depth = len(parts) - src_index - 2
        if depth == 0:
            return "./config"
        else:
            return "../" * depth + "config"
    except ValueError:
        return "./config"

def main():
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    
    # Create config.js
    config_path = os.path.join(src_dir, 'config.js')
    if not os.path.exists(config_path):
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write("export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';\n")
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                file_path = os.path.join(root, file)
                if file_path == config_path:
                    continue
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if 'http://127.0.0.1:8000' in content:
                    relative_config_path = get_relative_path_to_config(file_path)
                    
                    # Ensure import is added
                    if 'import { API_URL }' not in content:
                        # Find the last import statement or put at the top
                        lines = content.split('\n')
                        insert_idx = 0
                        for i, line in enumerate(lines):
                            if line.startswith('import '):
                                insert_idx = i + 1
                        
                        lines.insert(insert_idx, f"import {{ API_URL }} from '{relative_config_path}';")
                        content = '\n'.join(lines)
                    
                    # 1. Replace single quotes around the url: 'http://127.0.0.1:8000/api' -> `${API_URL}/api`
                    content = re.sub(r"'http://127\.0\.0\.1:8000(/[^']*)'", r"`${API_URL}\1`", content)
                    content = re.sub(r'"http://127\.0\.0\.1:8000(/[^"]*)"', r"`${API_URL}\1`", content)
                    
                    # 2. Replace inside existing template literals: `http://127.0.0.1:8000/api/${id}` -> `${API_URL}/api/${id}`
                    content = content.replace('http://127.0.0.1:8000', '${API_URL}')
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"Updated {file_path}")

if __name__ == "__main__":
    main()
