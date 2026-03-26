import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_roster():
    print("Fetching squads...")
    try:
        squads_res = requests.get(f"{BASE_URL}/squads/", timeout=5)
        if squads_res.status_code != 200:
            print("Failed to get squads:", squads_res.text)
            return
        squads = squads_res.json()
        print(f"Found {len(squads)} squads.")
    except Exception as e:
        print(f"Squads err: {e}")
        return

    if not squads:
        print("No squads found. Creating a test squad...")
        create_res = requests.post(f"{BASE_URL}/squads/", json={"name": "Test Squad", "category": "U11", "max_players": 15}, timeout=5)
        squads = [create_res.json()]
    squad_id = squads[0]['id']
    print(f"Using squad: {squads[0]['name']} ({squad_id})")

    print("\nFetching players...")
    try:
        players_res = requests.get(f"{BASE_URL}/players/", timeout=5)
        players = players_res.json()
        print(f"Found {len(players)} players.")
    except Exception as e:
        print(f"Players err: {e}")
        return
        
    if not players:
        print("No players found to assign.")
        return
    
    player_ids = [p['user_id'] for p in players[:2]]
    print(f"Assigning {len(player_ids)} players: {player_ids}")

    patch_res = requests.patch(f"{BASE_URL}/squads/{squad_id}/roster", json={"player_ids": player_ids}, timeout=5)
    print(f"Response ({patch_res.status_code}):", patch_res.text)

if __name__ == "__main__":
    test_roster()
