#!/usr/bin/env python3
"""Generate course module banners in ONE™ Design System style (System 4).
White background, hand-drawn sketch, 4-color semantic, English text."""
import json
import os
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

BASE_STYLE = """STYLE: Hand-drawn sketch on pure white background. Engineering notebook aesthetic.
BACKGROUND: Pure solid white #FFFFFF — no texture, no dots, no grid.
LINES: Dark black pencil lines, slightly imperfect, organic wobble, pencil texture visible.
COLORS: Colored pencil/crayon texture fills (NOT flat digital):
- Blue (#4285F4): For audience/community/content concepts
- Green (#34A853): For problem/growth/self-work concepts
- Red/Pink (#EA4335): For promise/sales/urgency concepts
- Yellow/Gold (#FBBC04): For method/system/framework concepts
FIGURES: Simple stick figures with round heads and dot eyes. Expressive through posture.
AVOID: Digital perfection, gradients, shadows, dark backgrounds, stock photos, polished look, realistic illustrations."""

# Map each level to a visual theme + primary color
LEVEL_PROMPTS = {
    "L0": {
        "color": "a mix of all 4 colors (blue, green, red, yellow)",
        "theme": "a compass or north star with a path leading forward, stick figure taking first step"
    },
    "L1": {
        "color": "red (#EA4335) colored pencil",
        "theme": "a mirror reflection or identity transformation, stick figure looking at better version of self"
    },
    "L2": {
        "color": "yellow (#FBBC04) colored pencil",
        "theme": "a blueprint/mechanical system or flywheel, gears and arrows showing a system"
    },
    "L3": {
        "color": "yellow (#FBBC04) and red (#EA4335) colored pencil",
        "theme": "a product/offer being built, boxes stacking up, a document or package"
    },
    "SPRINT": {
        "color": "green (#34A853) colored pencil",
        "theme": "a lightning bolt or cash/speed, stick figure running fast, urgency"
    },
    "L4": {
        "color": "blue (#4285F4) colored pencil",
        "theme": "community/email/magnets, people connecting, letters/envelopes"
    },
    "L5": {
        "color": "blue (#4285F4) and yellow (#FBBC04) colored pencil",
        "theme": "content creation, camera/phone, social media icons, creative process"
    },
    "L6": {
        "color": "red (#EA4335) colored pencil",
        "theme": "closing/sales, handshake, chat bubbles, target with arrow"
    },
    "L7": {
        "color": "blue (#4285F4) colored pencil",
        "theme": "depth/authority, anchor, long-form content, microphone/camera"
    },
    "L8": {
        "color": "green (#34A853) and blue (#4285F4) colored pencil",
        "theme": "systems/automation, dashboards, gears working together, operator at controls"
    },
}


def get_modules():
    url = f"{SUPABASE_URL}/rest/v1/course_modules"
    params = {
        "select": "id,number,name,level_id",
        "source": "neq.removed",
        "visible": "eq.true",
        "order": "number",
    }
    resp = requests.get(url, headers=HEADERS_SB, params=params)
    return resp.json()


def generate_banner(module_name, module_number, level_id):
    level = LEVEL_PROMPTS.get(level_id, LEVEL_PROMPTS["L0"])

    prompt = f"""{BASE_STYLE}

Create a course module banner illustration.

Topic: "{module_name}" (module {module_number})
Primary accent: {level['color']}
Visual metaphor: {level['theme']}

Draw a hand-drawn sketch that captures the concept of "{module_name}".
Use the visual metaphor as inspiration but adapt it to the specific topic.
Include 1-2 stick figures interacting with the concept.
Write the module title "{module_name}" in English, in a hand-lettered style at the top.
Add the module number "{module_number}" small in the corner.

White background, colored pencil fills, black pencil lines. Hand-drawn aesthetic."""

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


def update_banner_ready(module_id):
    url = f"{SUPABASE_URL}/rest/v1/course_modules?id=eq.{module_id}"
    requests.patch(url, headers=HEADERS_SB, json={"banner_ready": True})


def main():
    modules = get_modules()
    total = len(modules)

    print(f"\n{'='*60}")
    print(f"ONE™ Banner Generator v2 — System 4 Style")
    print(f"{total} banners to create (white bg, hand-drawn, English)")
    print(f"Output: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    success = 0
    failed = 0

    for i, mod in enumerate(modules):
        print(f"[{i+1}/{total}] {mod['number']} {mod['name']}...", end=" ", flush=True)

        filepath = generate_banner(mod["name"], mod["number"], mod["level_id"])
        if filepath:
            update_banner_ready(mod["id"])
            size_kb = os.path.getsize(filepath) // 1024
            print(f"OK ({size_kb}KB)")
            success += 1
        else:
            print("FAILED")
            failed += 1

        if i < total - 1:
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"DONE: {success} success, {failed} failed, {total} total")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
