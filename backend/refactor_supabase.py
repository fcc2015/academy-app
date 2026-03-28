import os

fpath = os.path.join(os.path.dirname(__file__), "services", "supabase_client.py")

with open(fpath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace direct calls with wrapped calls
content = content.replace("self.client.patch", "self._patch")
content = content.replace("self.client.delete", "self._delete")

# Add the new wrapper methods right after _post
new_methods = """
    async def _patch(self, endpoint: str, **kwargs):
        res = await self.client.patch(f"{self.url}{endpoint}", **kwargs)
        return res

    async def _delete(self, endpoint: str, **kwargs):
        res = await self.client.delete(f"{self.url}{endpoint}", **kwargs)
        return res
"""

content = content.replace("return res.json()\n\n        \n    async def sign_in_with_password", "return res.json()\n\n" + new_methods + "\n    async def sign_in_with_password")

with open(fpath, "w", encoding="utf-8") as f:
    f.write(content)

print("Done refactoring HTTP method calls.")
