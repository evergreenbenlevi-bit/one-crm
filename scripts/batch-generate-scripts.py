#!/usr/bin/env python3
"""Batch generate ONE™ course scripts using Claude Sonnet."""
import json
import os
import sys
import time
import requests

SUPABASE_URL = "https://yrurlhjpzkztfwntgpzn.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

if not SUPABASE_KEY or not ANTHROPIC_KEY:
    # Try loading from .env.local
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v
        SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

SYSTEM_PROMPT = """You are the ONE™ Course Copywriter. You write course scripts for Ben Levi and Avitar's coaching program.

RULES:
- Write in native Hebrew (think in Hebrew, don't translate from English)
- Direct, conversational tone — like talking to a friend
- Replace ALL of Tom Young's personal stories with generic examples
- Keep the teaching methodology and frameworks — change the packaging
- Use English terms naturally where Israelis would (Framework, Flywheel, Avatar, CTA, Lead Magnet, etc.)
- Every script ends with a clear CTA (open playbook, do exercise, watch next)
- Length: 600-1200 words depending on module complexity
- Format: clear headers (##), short paragraphs, bullet points where needed
- NEVER use these phrases: בהחלט, ניתן לראות כי, על מנת ל, אשמח לסייע, באופן כללי, יש לציין כי
- Sound like Ben: confident, direct, zero fluff, slightly provocative
- NO meta-commentary. Just the script text.

STRUCTURE:
1. Hook — why this matters NOW
2. Core teaching — the framework/concept
3. Practical application — what to do with this
4. CTA — specific next action

CONTEXT ABOUT ONE™:
- ONE™ is a coaching program for experts building a marketing + sales system
- 10 Levels: L0 (Onboarding), L1 (Mindset), L2 (Strategy), L3 (Offer), L4 (Email+Magnets), L5 (Content), L6 (Sales), L7 (Long Form), L8 (Scale), SPRINT (Cash Sprints)
- Ben teaches marketing/sales/AI. Avitar teaches coaching/delivery
- Philosophy: "80% ready = ship it", "your business your rules", "life before business"
- Uses ONE Flywheel™, ONE Matrix™, Maturity Stairs™ as proprietary frameworks
- Target: Hebrew-speaking coaches, consultants, therapists, experts who want online business without burnout"""


def get_modules_needing_scripts():
    """Fetch all visible, non-removed modules without scripts."""
    url = f"{SUPABASE_URL}/rest/v1/course_modules"
    params = {
        "select": "id,number,name,description,client_benefit,tom_transcript,source,level_id",
        "source": "neq.removed",
        "visible": "eq.true",
        "script": "is.null",
        "order": "number",
    }
    resp = requests.get(url, headers=HEADERS_SB, params=params)
    return resp.json()


def generate_script(mod):
    """Generate a script for a single module."""
    has_tom = bool(mod.get("tom_transcript"))

    prompt = f'Write a course script for module {mod["number"]}: "{mod["name"]}"'
    if mod.get("description"):
        prompt += f'\n\nModule description: {mod["description"]}'
    if mod.get("client_benefit"):
        prompt += f'\nClient benefit: {mod["client_benefit"]}'

    if has_tom:
        prompt += f'\n\n--- TOM\'S ORIGINAL TRANSCRIPT (use as source, rewrite in ONE™ voice) ---\n{mod["tom_transcript"]}'
        prompt += '\n\n--- INSTRUCTIONS ---\nKeep core teaching. Remove Tom\'s stories. Write in Ben\'s voice. Hebrew. Direct. Output ONLY the script.'
    else:
        prompt += '\n\n--- INSTRUCTIONS ---\nThis is an original ONE™ module (no Tom source). Write a complete script based on the topic. Hebrew. Direct. Ben\'s voice. Output ONLY the script.'

    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": prompt}],
        },
    )

    if resp.status_code != 200:
        print(f"  ERROR: API returned {resp.status_code}: {resp.text[:200]}")
        return None

    data = resp.json()
    text_blocks = [b["text"] for b in data["content"] if b["type"] == "text"]
    return "\n".join(text_blocks)


def save_script(module_id, script):
    """Save script to Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/course_modules?id=eq.{module_id}"
    resp = requests.patch(url, headers=HEADERS_SB, json={"script": script})
    return resp.status_code < 300


def main():
    modules = get_modules_needing_scripts()
    total = len(modules)
    print(f"\n{'='*60}")
    print(f"ONE™ Script Generator — {total} modules to process")
    print(f"{'='*60}\n")

    success = 0
    failed = 0

    for i, mod in enumerate(modules):
        has_tom = "TOM" if mod.get("tom_transcript") else "ORIG"
        print(f"[{i+1}/{total}] {mod['number']} {mod['name']} [{has_tom}]...", end=" ", flush=True)

        script = generate_script(mod)
        if script:
            word_count = len(script.split())
            if save_script(mod["id"], script):
                print(f"OK ({word_count} words)")
                success += 1
            else:
                print("SAVE FAILED")
                failed += 1
        else:
            print("GENERATE FAILED")
            failed += 1

        # Rate limiting — be respectful
        if i < total - 1:
            time.sleep(1)

    print(f"\n{'='*60}")
    print(f"DONE: {success} success, {failed} failed, {total} total")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
