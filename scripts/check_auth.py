import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load ENV
load_dotenv(dotenv_path='backend/.env')

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

EMAIL = 'admin@academy.com'

def check_user():
    print(f"--- Checking user: {EMAIL} ---")
    
    # Check if user exists in auth.users via SQL (requires service_role)
    try:
        # We try to use the client's admin functionality if possible, 
        # but typically this requires the service_role key which SUPABASE_KEY might not be.
        # Let's check public.users first to see if they were synced
        res = supabase.table('users').select('*').eq('email', EMAIL).execute()
        print(f"Public users table check: {res.data}")
        
        if not res.data:
            print("ALERT: User not found in public.users table!")
        else:
            role = res.data[0].get('role')
            print(f"Current role in DB: {role}")
            if role != 'admin':
                print("FIXING ROLE to 'admin'...")
                supabase.table('users').update({'role': 'admin'}).eq('email', EMAIL).execute()
                print("Role updated.")

    except Exception as e:
        print(f"Error checking DB: {e}")

    # Note: We can't easily confirm email without service_role key.
    # But we can try to sign in to verify if it works now.
    print("\nAttempting sign-in test...")
    try:
        auth_res = supabase.auth.sign_in_with_password({
            "email": EMAIL,
            "password": "123456"
        })
        print("SUCCESS: Logged in successfully!")
        print(f"User Metadata: {auth_res.user.user_metadata}")
    except Exception as e:
        print(f"FAIL: Login failed: {e}")

if __name__ == "__main__":
    check_user()
