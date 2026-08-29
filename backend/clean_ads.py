import asyncio
from services.supabase_client import supabase

async def main():
    await supabase._delete('/rest/v1/advertisements?id=neq.00000000-0000-0000-0000-000000000000')
    print("ALL DUMMY ADS CLEARED.")

if __name__ == '__main__':
    asyncio.run(main())
