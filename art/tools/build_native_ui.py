#!/usr/bin/env python3
"""Project-authored monoline symbols. No fonts, embedded bitmaps or third-party artwork."""
from pathlib import Path
import json

SYMBOLS = {'item': {'herb': 'M12 21V8m0 7Q3 15 4 7q8 0 8 8m0-3Q21 12 20 3q-8 1-8 9', 'dew': 'M12 2C9 8 5 10 5 15a7 7 0 0 0 14 0C19 10 15 8 12 2Zm-4 13q0 4 4 4', 'core': 'M12 4 4 8v8l8 4 8-4V8ZM4 8l8 4 8-4m-8 4v8m0-16v4', 'jade': 'm8 3-5 8 9 10 9-10-5-8Zm-5 8h18M8 3l4 18 4-18', 'lotus': 'M12 3Q4 11 12 20 20 11 12 3Zm0 17Q1 18 2 9q8 0 10 11Zm0 0q11-2 10-11-8 0-10 11', 'soul': 'M13 2q3 7-1 10 7-3 8 4a8 8 0 0 1-16-1q-1-6 5-10-2 7 2 8 3-4 2-11Z', 'dao': 'M3 12q4-9 9 0t9 0q-4-9-9 0t-9 0ZM12 2v3m0 14v3', 'healing_pill': 'M8 3h8v4H8Zm1 4-3 4v8q6 4 12 0v-8l-3-4M8 14h8m-4-4v8', 'spirit_pill': 'M8 3h8v4H8Zm1 4-3 4v8q6 4 12 0v-8l-3-4m-3 3q-5 5 0 8 5-3 0-8Z', 'foundation_pill': 'M8 3h8v4H8Zm1 4-3 4v8q6 4 12 0v-8l-3-4M8 17l4-5 4 5Z', 'golden_pill': 'M8 3h8v4H8Zm1 4-3 4v8q6 4 12 0v-8l-3-4m0 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z', 'nascent_pill': 'M8 3h8v4H8Zm1 4-3 4v8q6 4 12 0v-8l-3-4m-3 3 4 4-4 4-4-4Z', 'spirit_seed': 'M12 21V9q-6-8-9-4 0 8 9 8 9 0 9-8-3-4-9 4m-4 12h8', 'ascension_seal': 'M5 21V5h14v16M3 5l9-3 9 3M9 9h6v12M3 21h18m-9-12v12'}, 'skill': {'sword_mind': 'M12 3a9 9 0 1 0 9 9M7 18 17 5l-2 6-5 7m-3-3 4 4', 'sword_still': 'M3 20h18M5 16q7-17 14 0M12 4v13M4 10q8 0 8 9 0-9 8-9', 'sword_build': 'M5 21 19 3l-3 8-8 10m-4-5 5 5M3 4q8-4 16 1', 'sword_guard': 'M12 2 3 6v7q1 6 9 9 8-3 9-9V6Zm-5 14L17 7m-9 5 5 5', 'sword_release': 'M3 21 18 3l-3 8-9 10m-3-6 6 6M19 14l1 2 2 1-2 1-1 3-1-3-2-1 2-1Z', 'sword_echo': 'M4 21 17 5l-2 6-8 10m-3-6 5 5M4 6q8-7 16 0M3 11q8-6 17-1', 'talisman_mind': 'M7 3h12v18H5V5h2Zm3 5h6m-6 4h6m-6 4h4M2 5a9 9 0 0 0 0 14', 'talisman_calm': 'M6 3h12v18H6Zm4 4h4m-4 5h4M2 10h2m16 0h2M2 16h2m16 0h2', 'talisman_build': 'M6 2h12v20H6Zm4 5h4m-5 5 3-2 3 2m-6 5 3-2 3 2', 'talisman_frost': 'M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1V5m14 9-4 1v4', 'talisman_release': 'M6 3h12v18H6Zm4 5h4m-4 4h4M2 2l2 2m16 0 2-2M2 22l2-2m16 0 2 2', 'talisman_return': 'M7 5h10v16H7Zm3 5h4m-4 5h4M3 10A9 9 0 0 1 20 6M20 2v4h-4'}, 'relic': {'frost_sword': 'M5 21 18 3l-3 8-7 9m-4-5 5 5M5 3v6M2 6h6m11 8v6m-3-3h6', 'jade_seal': 'M4 15h16v7H4Zm3 0V9h10v6M8 9V6l4-4 4 4v3M7 19h10', 'soul_lamp': 'M4 16h16l-4 5H8Zm8-14q5 5 3 8 4-2 4 3H5q0-4 4-7-1 5 2 5 2-4 1-9Z', 'cloud_mirror': 'M12 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-4 18h8m-4-2v2M6 12q0-4 4-3 1-4 4-2 3 0 3 4H6'}, 'nav': {'cultivate': 'M12 3q-8 8 0 17 8-9 0-17ZM3 12q9 0 9 8 0-8 9-8M3 22h18', 'explore': 'M2 20 9 5l4 8 3-5 6 12ZM9 5l2 7H6', 'inventory': 'M7 3h10l-2 5q7 4 7 10-1 4-10 4S2 22 2 18q0-6 7-10ZM8 8h8m-4 5v5m-3-2h6', 'karma': 'M10 8a5 5 0 1 0-5 9h4M14 16a5 5 0 1 0 5-9h-4M8 16l8-8'}, 'action': {'save': 'M5 3h14v18H5Zm3 0v6h8V3M8 14l3 3 6-6', 'help': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM9 8q0-4 5-3 5 2 0 5-2 1-2 4m0 3v1', 'close': 'M4 4l16 16M20 4 4 20', 'back': 'M11 5 4 12l7 7M4 12h11q6 0 6 7', 'restore': 'M4 7A9 9 0 1 1 3 16M3 3v5h5m4-2v6l4 3', 'export': 'M5 3h9v7h7v11H5Zm9 0 7 7M8 16h9m-3-3 3 3-3 3'}}

def render():
    parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">']
    for kind,entries in SYMBOLS.items():
        for name,path in entries.items():
            parts.append(f'<symbol id="{kind}-{name}" viewBox="0 0 24 24"><path d="{path}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>')
    return '\n'.join(parts+['</svg>',''])

if __name__=='__main__':
    root=Path(__file__).resolve().parents[2]
    (root/'web/public/art/ui-kit.svg').write_text(render())
    registry={kind:{key:kind+'-'+key for key in entries} for kind,entries in SYMBOLS.items()}
    (root/'web/src/ui-icons.ts').write_text('export const ICONS = '+json.dumps(registry,ensure_ascii=False,indent=2)+' as const;\n')
    print('40 project-authored symbols')
