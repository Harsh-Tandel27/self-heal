import urllib.request
import urllib.parse
import json
import time

def request(method, url, data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.data = json.dumps(data).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.read().decode('utf-8')}")
        raise

def run_test():
    try:
        print("1. Clearing DB...")
        request("DELETE", "http://localhost:8000/api/clear-database")
        
        print("2. Starting Checkout Storm...")
        request("POST", "http://localhost:8000/scenarios/start/checkout_storm")
        
        print("3. Waiting 15s for analysis...")
        time.sleep(15)
        
        print("4. Checking pending workflows...")
        data = request("GET", "http://localhost:8000/api/workflows/pending")
        workflows = data.get("workflows", [])
        
        if not workflows:
            print("❌ No workflows found")
            return
            
        wf = workflows[0]
        print(f"✅ Found Workflow: {wf['name']} (ID: {wf['_id']})")
        
        # Verify step matching
        steps = wf.get('steps', [])
        fix_step = next((s for s in steps if s['action_type'] == 'fix_store_chaos'), None)
        
        if fix_step:
            print(f"✅ Has Real Fix Step: {fix_step['name']}")
            print(f"   -> Params: {fix_step.get('parameters')}")
        else:
            print("❌ Missing Real Fix Step!")
            print(json.dumps(steps, indent=2))
            return

        print("5. Approving Workflow...")
        request("POST", f"http://localhost:8000/api/workflows/{wf['_id']}/approve?user_id=tester")
        
        print("6. Waiting 5s for execution...")
        time.sleep(5)
        
        print("7. Checking Scenario Status...")
        status = request("GET", "http://localhost:8000/scenarios/status/checkout_storm")
        st = status.get('status')
        print(f"   -> Scenario Status: {st}")
        
        if st == 'stopped' or st == 'not_running' or st == 'completed':
            print("🎉 SUCCESS! Scenario was stopped by the Agent's fix.")
        else:
            print("❌ FAIL! Scenario is still running.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_test()
