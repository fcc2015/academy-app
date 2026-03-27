/**
 * Script to replace all fetch(`${API_URL}...`) calls with authFetch()
 * and add the import if missing.
 * 
 * Run: node scripts/add_auth_fetch.js
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Files that should NOT have auth (public endpoints)
const SKIP_FILES = [
  'LandingPage.jsx', // Public page, some calls need to stay public
  'AdminLogin.jsx',  // Login page - no token yet
  'AuthCallback.jsx', // OAuth callback
  'DownloadPage.jsx', // Public page
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walkDir(filePath));
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

let totalChanged = 0;
let filesChanged = [];

const files = walkDir(SRC_DIR);

for (const filePath of files) {
  const fileName = path.basename(filePath);
  
  // Skip files that should not have auth
  if (SKIP_FILES.includes(fileName)) {
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Check if file has fetch(`${API_URL} calls
  if (!content.includes('fetch(`${API_URL}')) {
    continue;
  }
  
  // Replace fetch(`${API_URL}...) with authFetch(`${API_URL}...)
  content = content.replace(/(?<!\w)fetch\(`\$\{API_URL\}/g, 'authFetch(`${API_URL}');
  
  if (content === original) {
    continue;
  }
  
  // Add authFetch import if not already present
  if (!content.includes('authFetch')) {
    continue; // shouldn't happen but safety check
  }
  
  if (!content.includes("from '../../api'") && !content.includes("from '../api'") && !content.includes("from '../../api.js'") && !content.includes("from '../api.js'") && !content.includes("from '../../../api'")) {
    // Determine relative path
    const relToSrc = path.relative(path.dirname(filePath), path.join(SRC_DIR));
    const importPath = relToSrc.replace(/\\/g, '/') + '/api';
    
    // Check if there's already an API_URL import from config
    if (content.includes("import { API_URL }")) {
      // Add authFetch import after the API_URL import
      content = content.replace(
        /import \{ API_URL \} from ['"]([^'"]+)['"]/,
        `import { API_URL } from '$1';\nimport { authFetch } from '${importPath}'`
      );
    } else {
      // Add at the top
      content = `import { authFetch } from '${importPath}';\n` + content;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  totalChanged++;
  filesChanged.push(path.relative(SRC_DIR, filePath));
}

console.log(`\n✅ Updated ${totalChanged} files:`);
filesChanged.forEach(f => console.log(`   • ${f}`));
console.log('');
