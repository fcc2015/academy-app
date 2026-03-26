import os

def main():
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                file_path = os.path.join(root, file)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                api_url_line = None
                new_lines = []
                for line in lines:
                    if 'import { API_URL }' in line:
                        api_url_line = line
                    else:
                        new_lines.append(line)
                
                if api_url_line:
                    # insert at the top (after any empty lines if necessary, but line 0 is safe usually)
                    new_lines.insert(0, api_url_line)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.writelines(new_lines)
                    print(f"Fixed {file_path}")

if __name__ == "__main__":
    main()
