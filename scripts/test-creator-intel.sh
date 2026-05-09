#!/bin/bash
# Phase 1 validation — lobstr.io + AssemblyAI end-to-end test
# Run: bash scripts/test-creator-intel.sh
# Requires: LOBSTR_API_KEY, LOBSTR_INSTAGRAM_CRAWLER_ID, ASSEMBLYAI_API_KEY in .env.local

set -e
source .env.local 2>/dev/null || true

echo "=== Creator Intel Phase 1 Validation ==="
echo ""

# Checks
if [ -z "$LOBSTR_API_KEY" ]; then echo "FAIL: LOBSTR_API_KEY missing"; exit 1; fi
if [ -z "$LOBSTR_INSTAGRAM_CRAWLER_ID" ]; then echo "FAIL: LOBSTR_INSTAGRAM_CRAWLER_ID missing"; exit 1; fi
if [ -z "$ASSEMBLYAI_API_KEY" ]; then echo "FAIL: ASSEMBLYAI_API_KEY missing"; exit 1; fi
echo "Keys: all present"
echo ""

CREATOR="hayleygracepoetry"
LIMIT=30

# --- Step 1: Create squid ---
echo "Step 1: Creating lobstr.io squid..."
SQUID=$(curl -s -X POST "https://api.lobstr.io/v1/squids" \
  -H "Authorization: Token $LOBSTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"crawler\": \"$LOBSTR_INSTAGRAM_CRAWLER_ID\", \"name\": \"test-$CREATOR\"}")
SQUID_ID=$(echo $SQUID | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$SQUID_ID" ]; then echo "FAIL: Squid creation failed. Response: $SQUID"; exit 1; fi
echo "Squid ID: $SQUID_ID"

# --- Step 2: Add task ---
echo "Step 2: Adding task (@$CREATOR, limit=$LIMIT)..."
TASK=$(curl -s -X POST "https://api.lobstr.io/v1/squids/$SQUID_ID/tasks" \
  -H "Authorization: Token $LOBSTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://www.instagram.com/$CREATOR/\", \"max_results\": $LIMIT}")
echo "Task added: $(echo $TASK | grep -o '"id":"[^"]*"' | head -1)"

# --- Step 3: Start run ---
echo "Step 3: Starting run..."
RUN=$(curl -s -X POST "https://api.lobstr.io/v1/runs" \
  -H "Authorization: Token $LOBSTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"squid\": \"$SQUID_ID\"}")
RUN_ID=$(echo $RUN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$RUN_ID" ]; then echo "FAIL: Run start failed. Response: $RUN"; exit 1; fi
echo "Run ID: $RUN_ID"

# --- Step 4: Poll ---
echo "Step 4: Polling (max 240s)..."
for i in $(seq 1 48); do
  sleep 5
  STATUS=$(curl -s "https://api.lobstr.io/v1/runs/$RUN_ID" \
    -H "Authorization: Token $LOBSTR_API_KEY")
  S=$(echo $STATUS | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 | tr '[:upper:]' '[:lower:]')
  echo "  [${i}] status: $S"
  if [[ "$S" == "done" || "$S" == "completed" || "$S" == "finished" ]]; then
    echo "Run complete."
    break
  fi
  if [[ "$S" == "failed" || "$S" == "error" ]]; then
    echo "FAIL: Run failed. $STATUS"; exit 1
  fi
done

# --- Step 5: Get results ---
echo ""
echo "Step 5: Fetching results..."
RESULTS=$(curl -s "https://api.lobstr.io/v1/results?run=$RUN_ID&page_size=10" \
  -H "Authorization: Token $LOBSTR_API_KEY")
COUNT=$(echo $RESULTS | grep -o '"count":[0-9]*' | head -1 | cut -d: -f2)
echo "Total results: ${COUNT:-unknown}"
echo ""

# Check fields
echo "=== Field Check (first result) ==="
echo $RESULTS | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('results', data) if isinstance(data, dict) else data
if not items:
    print('FAIL: 0 results')
    sys.exit(1)
r = items[0] if isinstance(items, list) else items
fields = ['video_view_count','views','likes_count','likes','comments_count','comments',
          'caption','video_url','thumbnail_url','timestamp','url']
for f in fields:
    val = r.get(f)
    status = 'YES' if val else 'null'
    if val: print(f'  {f}: {status} ({str(val)[:60]})')
    else: print(f'  {f}: {status}')
print()
print('All field names present:', list(r.keys())[:15])
" 2>/dev/null || echo "Note: python3 required for field check"

# --- Step 6: AssemblyAI test ---
echo ""
echo "=== AssemblyAI Test ==="
VIDEO_URL=$(echo $RESULTS | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('results', data) if isinstance(data, dict) else data
for r in (items if isinstance(items, list) else [items]):
    url = r.get('video_url') or r.get('videoUrl') or r.get('download_url')
    if url:
        print(url[:200])
        break
" 2>/dev/null)

if [ -z "$VIDEO_URL" ]; then
  echo "SKIP: no video_url in lobstr results — AssemblyAI test skipped"
  echo "NOTE: transcript field will remain null until lobstr returns video URLs"
else
  echo "Video URL found: ${VIDEO_URL:0:80}..."
  echo "Submitting to AssemblyAI..."
  JOB=$(curl -s -X POST "https://api.assemblyai.com/v2/transcript" \
    -H "Authorization: $ASSEMBLYAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"audio_url\": \"$VIDEO_URL\", \"speech_model\": \"best\", \"language_detection\": true}")
  JOB_ID=$(echo $JOB | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$JOB_ID" ]; then echo "FAIL: AssemblyAI submit failed. $JOB"; else
    echo "Job ID: $JOB_ID — polling..."
    for i in $(seq 1 30); do
      sleep 3
      POLL=$(curl -s "https://api.assemblyai.com/v2/transcript/$JOB_ID" \
        -H "Authorization: $ASSEMBLYAI_API_KEY")
      STATUS=$(echo $POLL | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "  [$i] $STATUS"
      if [ "$STATUS" = "completed" ]; then
        TEXT=$(echo $POLL | python3 -c "import sys,json; print(json.load(sys.stdin).get('text','')[:200])" 2>/dev/null)
        echo ""
        echo "TRANSCRIPT (first 200 chars): $TEXT"
        break
      fi
      if [ "$STATUS" = "error" ]; then echo "FAIL: AssemblyAI error. $POLL"; break; fi
    done
  fi
fi

echo ""
echo "=== Phase 1 Done ==="
echo "Next: update Vercel env vars + trigger instagram-viral-sync cron"
