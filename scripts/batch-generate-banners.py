#!/usr/bin/env python3
"""Generate course module banners using Gemini Image Generation."""
import json
import os
import sys
import time
import requests

# Load env
for env_path in [
    os.path.expanduser("~/.claude/.env"),
    os.path.join(os.path.dirname(__file__), "..", ".env.local"),
]:
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ.setdefault(k, v)

from google import genai
from google.genai import types

SUPABASE_URL = "https://yrurlhjpzkztfwntgpzn.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

HEADERS_SB = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

OUTPUT_DIR = os.path.expanduser("~/Projects/ONE-offer-doc/public/images/course-banners")
os.makedirs(OUTPUT_DIR, exist_ok=True)

client = genai.Client(api_key=GEMINI_KEY)

LEVEL_THEMES = {
    "L0": {"color": "gray (#6B7280)", "vibe": "clean, starting point, compass, north star"},
    "L1": {"color": "red (#DC2626)", "vibe": "fire, transformation, identity, mirror"},
    "L2": {"color": "orange (#EA580C)", "vibe": "energy, blueprint, machinery, flywheel"},
    "L3": {"color": "gold (#CA8A04)", "vibe": "premium, treasure, value, diamond"},
    "SPRINT": {"color": "green (#16A34A)", "vibe": "cash, speed, lightning, sprint"},
    "L4": {"color": "emerald (#059669)", "vibe": "growth, community, network, branches"},
    "L5": {"color": "blue (#2563EB)", "vibe": "journey, waves, content, flow"},
    "L6": {"color": "navy (#1E40AF)", "vibe": "trust, precision, target, close"},
    "L7": {"color": "purple (#7C3AED)", "vibe": "depth, anchor, authority, weight"},
    "L8": {"color": "dark silver (#374151)", "vibe": "systems, circuits, automation, scale"},
}


def get_modules():
    url = f"{SUPABASE_URL}/rest/v1/course_modules"
    params = {
        "select": "id,number,name,level_id,banner_ready",
        "source": "neq.removed",
        "visible": "eq.true",
        "order": "number",
    }
    resp = requests.get(url, headers=HEADERS_SB, params=params)
    return resp.json()


def generate_banner(module_name, module_number, level_id):
    level = LEVEL_THEMES.get(level_id, LEVEL_THEMES["L0"])

    prompt = f"""Create a minimal, abstract banner image.
Dark background (#0A0A0A), with abstract geometric shapes and gradients in {level['color']}.
Mood/vibe: {level['vibe']}.
NO text, NO words, NO letters, NO numbers. Pure abstract art.
Aspect ratio: 16:9 landscape, wide.
Professional, clean, premium feel. Subtle glow effects. Minimal. Elegant.
Think Apple keynote background meets geometric art.
Visual metaphor hint (don't write it, just inspire the shapes): {module_name}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data is not None:
                img = part.as_image()
                filename = f"{module_number.replace('.', '-')}.png"
                filepath = os.path.join(OUTPUT_DIR, filename)
                img.save(filepath)
                return filepath
    except Exception as e:
        print(f"ERROR: {e}")
        return None

    return None


def mark_banner_ready(module_id):
    url = f"{SUPABASE_URL}/rest/v1/course_modules?id=eq.{module_id}"
    requests.patch(url, headers=HEADERS_SB, json={"banner_ready": True})


def main():
    modules = get_modules()
    todo = [m for m in modules if not m.get("banner_ready")]
    total = len(todo)

    print(f"\n{'='*60}")
    print(f"ONE™ Banner Generator — {total} banners to create")
    print(f"Output: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    success = 0
    failed = 0

    for i, mod in enumerate(todo):
        print(f"[{i+1}/{total}] {mod['number']} {mod['name']}...", end=" ", flush=True)

        filepath = generate_banner(mod["name"], mod["number"], mod["level_id"])
        if filepath:
            mark_banner_ready(mod["id"])
            size_kb = os.path.getsize(filepath) // 1024
            print(f"OK ({size_kb}KB)")
            success += 1
        else:
            print("FAILED")
            failed += 1

        # Rate limiting
        if i < total - 1:
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"DONE: {success} success, {failed} failed, {total} total")
    print(f"Banners at: {OUTPUT_DIR}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
