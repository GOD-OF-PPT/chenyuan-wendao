"""Validate only this documentation package. Does not run game or browser tests."""
from pathlib import Path
import re
import json
import unicodedata
from urllib.parse import unquote, urlsplit
from audit_economy import calculate

ROOT = Path(__file__).resolve().parents[1]

def anchor(title):
    text = title.lower().strip().replace(' ', '-')
    return ''.join(c for c in text if c in '-_' or unicodedata.category(c)[0] in 'LN')

def check():
    errors, local_links, remote_links = [], 0, 0
    documents = sorted(ROOT.glob('*.md'))
    for doc in documents:
        text = doc.read_text(encoding='utf-8')
        if len(re.findall(r'^```', text, re.M)) % 2:
            errors.append(f'{doc.name}: unbalanced code fences')
        if '\ufffd' in text:
            errors.append(f'{doc.name}: replacement characters')
        for link in re.findall(r'\]\(([^)]+)\)', text):
            parts = urlsplit(link)
            if parts.scheme in ('http', 'https'):
                remote_links += 1
                continue
            if parts.scheme:
                errors.append(f'{doc.name}: unexpected link scheme {parts.scheme}')
                continue
            target = (doc.parent / unquote(parts.path)).resolve() if parts.path else doc
            local_links += 1
            if not target.is_file():
                errors.append(f'{doc.name}: missing target {link}')
                continue
            if parts.fragment and target.suffix == '.md':
                titles = re.findall(r'^#{1,6}\s+(.+)$', target.read_text(encoding='utf-8'), re.M)
                if unquote(parts.fragment) not in {anchor(t) for t in titles}:
                    errors.append(f'{doc.name}: missing anchor {link}')
    result = calculate()
    if len(result['fixedStrategyPlans']) != 30:
        errors.append('expected 5 realms x 3 fixed strategies x 2 cultivation methods')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(json.dumps({'status':'PASS','markdownFiles':len(documents),'localLinks':local_links,
                      'externalLinksListedNotNetworkValidated':remote_links,'staticPlans':30,
                      'notTested':['runtime game','dependency installation','production build','browser tests','human playtest']},
                     ensure_ascii=False, indent=2))

if __name__ == '__main__':
    check()
