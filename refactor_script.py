import re

filepath = r"c:\Users\hp\Desktop\python_learning\academy-app\backend\services\supabase_client.py"

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Helper function to remove self.url + or f"{self.url}" from the endpoint argument
def clean_args(arg_str):
    arg_str = arg_str.replace('f"{self.url}', 'f"')
    arg_str = arg_str.replace('f\"{self.url}', 'f\"')
    arg_str = arg_str.replace('self.url + ', '')
    return arg_str

# We need to replace:
# await self.client.get(...) -> await self._get(...)
# await self.client.post(...) -> await self._post(...)
# await self.client.patch(...) -> await self._patch(...)
# await self.client.delete(...) -> await self._delete(...)
# BUT, we need to be careful:
# _get returns res.json() directly. BUT get_dashboard_stats uses self.client.get without await!
# Let's keep self.client.get in get_dashboard_stats and get_recent_activity?
# Wait! IF we keep it there, they DO NOT get academy_id injected!
# Instead, we should just let `_get` return `res` in those specific places, OR we rewrite those gather tasks to use asyncio.gather(self._get(...), ...) and then we don't need .json() since _get returns json.
# THIS IS AMAZING. If we change it to self._get(...), it returns JSON natively! So we can remove `.json()` and `status_code == 200` checks!
# Let's not fully automate get_dashboard_stats and get_recent_activity logic, I'll do them manually. So I'll exclude them from blind replace.

# For now, let's regex replace `await self.client...` matches
def repl(m):
    method = m.group(1)
    args = clean_args(m.group(2))
    return f"await self._{method}({args})"

# Regex only replaces calls that are `await self.client...` EXCEPT _execute_rpc which doesn't await here? No, _execute_rpc does `await self.client`.
# Wait, _execute_rpc works exactly the same.
new_text = re.sub(r"await self\.client\.(get|post|patch|delete)\((.*?)\)", repl, text)

# Now, we should also manually replace the `.client.get` in tasks = [...]
def repl_task(m):
    args = clean_args(m.group(1))
    return f"self._get({args})"

new_text = re.sub(r"self\.client\.get\((.*?)\)", repl_task, new_text)

# We must also make sure that we don't change `self.client = httpx.AsyncClient`!
# The above regexes won't match `self.client = ...` because of ().

# One problem: if `await self._delete(...)` returns `res` (which it does in my definition, wait, my _delete returns `res`!
# Let's check my _delete: it returns `res`. But the original callers of `await self.client.delete(...)` do things like `res = await self.client.delete... res.raise_for_status() return res.status_code == 204`
# So if they get `res` back, they are fine!

# Oh wait, `_patch` and `_post` and `_get` return `res.json()`.
# What do original callers of `post` and `patch` do?
# res = await self.client.patch(...)
# res.raise_for_status()
# return res.json()
# If we replace this with `res = await self._patch(...)`, `res` represents the dict (the json!).
# So `res.raise_for_status()` will fail because dict has no `raise_for_status`!
# AHA! The original code in SupabaseHttpClient is written mostly like:
# async def update_player(...):
#     res = await self.client.patch(...)
#     res.raise_for_status()
#     return res.json()
# Since they are simple wrappers themselves, we can just replace the WHOLE wrapper body with:
# return await self._patch(...)

with open("backend/services/supabase_client_refactored.py", "w", encoding='utf-8') as f:
    f.write(new_text)

print("Script generated supabase_client_refactored.py successfully!")
