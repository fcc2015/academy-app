const SUPABASE_URL = 'https://kbhnqntteexatihidhkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94';

async function createAdmin() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email: "admin@academy.com",
        password: "admin123",
        data: {
            role: 'super_admin',
            full_name: 'Super Admin'
        }
      })
    });
    
    const text = await res.text();
    console.log("Signup Status:", res.status);
    console.log("Signup Response:", text);
    
    if (res.status === 200 || res.status === 201) {
        console.log("Successfully created super admin account! You can now log in.");
    }
  } catch (err) {
    console.error("Error connecting:", err);
  }
}

createAdmin();
