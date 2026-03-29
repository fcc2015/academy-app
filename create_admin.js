async function createAdmin() {
  try {
    const res = await fetch('http://127.0.0.1:8000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin@academy.com",
        password: "admin123", /* using exactly what they typed in the screenshot */
        full_name: "SaaS Super Admin",
        role: "super_admin"
      })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Error connecting:", err);
  }
}
createAdmin();
