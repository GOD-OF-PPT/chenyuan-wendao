#!/usr/bin/env python3
"""Check repository Markdown paths and pinned Git objects without network access."""
import argparse
import html
import json
import re
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'GOD-OF-PPT/chenyuan-wendao'


def prose(text):
    # Keep newlines for useful diagnostics; fenced examples are not live links.
    fence = None
    rows = []
    for line in text.splitlines(keepends=True):
        mark = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if mark:
            token = mark[1]
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
            rows.append('\n' if line.endswith('\n') else '')
        else:
            rows.append(('\n' if line.endswith('\n') else '') if fence else line)
    return re.sub(r'<!--.*?-->', lambda m: '\n' * m[0].count('\n'), ''.join(rows), flags=re.S)


def inline_prose(text):
    """Mask matching backtick runs; preserve offsets and line numbers."""
    runs = list(re.finditer(r'`+', text))
    masked = list(text)
    index = 0
    while index < len(runs):
        opening = runs[index]
        prefix = text[:opening.start()]
        if len(prefix) - len(prefix.rstrip('\\')) & 1:
            index += 1
            continue
        closing = next((i for i in range(index + 1, len(runs))
                        if len(runs[i][0]) == len(opening[0])), None)
        if closing is None:
            index += 1
            continue
        for i in range(opening.start(), runs[closing].end()):
            if masked[i] != '\n':
                masked[i] = ' '
        index = closing + 1
    return ''.join(masked)


def destination(text, start):
    """Read a bare balanced or angle-wrapped Markdown destination."""
    index = start
    while index < len(text) and text[index].isspace():
        index += 1
    value = []
    if index < len(text) and text[index] == '<':
        end = text.find('>', index + 1)
        if end < 0 or '\n' in text[index:end]:
            return None
        return text[index + 1:end], end + 1
    depth = 0
    while index < len(text):
        char = text[index]
        if char == '\\' and index + 1 < len(text):
            value.append(text[index + 1])
            index += 2
            continue
        if char.isspace() or (char == ')' and depth == 0):
            break
        if char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
        value.append(char)
        index += 1
    return (''.join(value), index) if depth == 0 else None


def links(text):
    rendered = prose(text)
    text = inline_prose(rendered)
    for match in re.finditer(r'!?\[[^\]\n]*\]\(', text):
        parsed = destination(rendered, match.end())
        if parsed is None:
            continue
        target, end = parsed
        # A destination must belong to a complete link, with an optional title.
        suffix = rendered[end:]
        if re.match(r'\s*(?:[\"\'][^\n]*?[\"\']\s*)?\)', suffix):
            yield text.count('\n', 0, match.start()) + 1, html.unescape(target)
    for match in re.finditer(r'^ {0,3}\[[^\]\n]+\]:\s*(<[^>]+>|\S+)', text, re.M):
        yield text.count('\n', 0, match.start()) + 1, html.unescape(match[1].strip('<>'))
    for match in re.finditer(r'<(?:a|img)\b[^>]*?\b(?:href|src)=[\"\']([^\"\']+)', text, re.I):
        yield text.count('\n', 0, match.start()) + 1, html.unescape(match[1])


def anchors(text):
    text = prose(text)
    found = set(re.findall(r'\bid=[\"\']([^\"\']+)', text))
    used = {}
    for match in re.finditer(r'^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$', text, re.M):
        label = html.unescape(re.sub(r'<[^>]*>', '', match[1])).lower()
        slug = ''.join(c for c in label if c in ' _-' or unicodedata.category(c)[0] in 'LN')
        slug = slug.replace(' ', '-')
        index = used.get(slug, 0)
        used[slug] = index + 1
        found.add(slug + ('-' + str(index) if index else ''))
    return found


def check(root=ROOT):
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root)

    names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.md').decode().split('\0')
    files = sorted(set(name for name in names if name))
    trees, texts = {}, {}
    errors = []
    counts = {'markdownFiles': len(files), 'localLinks': 0, 'pinnedGitLinks': 0, 'externalLinksNotFetched': 0}

    def tree(commit):
        if commit not in trees:
            trees[commit] = {
                row.split(b'\t', 1)[1].decode(): row.split(b' ', 2)[1].decode()
                for row in git('ls-tree', '-r', '-t', '-z', commit).split(b'\0') if row
            }
        return trees[commit]

    for name in files:
        document = root / name
        if not document.is_file():
            errors.append({'file': name, 'line': 1, 'target': name, 'reason': 'document missing'})
            continue
        text = document.read_text(encoding='utf-8')
        visible = inline_prose(prose(text))
        definitions = {m[1].strip().lower() for m in re.finditer(r'^ {0,3}\[([^\]\n]+)\]:', visible, re.M)}
        for match in re.finditer(r'!?\[([^\]\n]+)\]\[([^\]\n]*)\]', visible):
            identifier = (match[2] or match[1]).strip().lower()
            if identifier not in definitions:
                errors.append({'file': name, 'line': visible.count('\n', 0, match.start()) + 1,
                               'target': identifier, 'reason': 'reference definition missing'})
        for line, target in links(text):
            url = urlsplit(target)
            fragment = unquote(url.fragment)
            reason = None
            content = None
            if url.scheme or url.netloc:
                match = re.fullmatch(r'/' + re.escape(REPOSITORY) + r'/(blob|tree)/([0-9a-f]{40})/(.+)', unquote(url.path)) if url.netloc == 'github.com' else None
                if not match:
                    counts['externalLinksNotFetched'] += 1
                    continue
                counts['pinnedGitLinks'] += 1
                kind, commit, path = match.groups()
                try:
                    actual = tree(commit).get(path.rstrip('/'))
                    if actual != ('blob' if kind == 'blob' else 'tree'):
                        reason = 'pinned Git object missing or wrong kind'
                    elif fragment and path.endswith('.md'):
                        key = commit + ':' + path
                        if key not in texts:
                            texts[key] = git('show', key).decode('utf-8')
                        content = texts[key]
                except subprocess.CalledProcessError:
                    reason = 'pinned Git commit unavailable; fetch complete history'
            else:
                counts['localLinks'] += 1
                path = (document.parent / unquote(url.path)).resolve() if url.path else document
                if not path.is_relative_to(root.resolve()):
                    reason = 'local link escapes repository'
                elif not path.exists():
                    reason = 'local target missing'
                elif fragment and path.is_file() and path.suffix == '.md':
                    content = path.read_text(encoding='utf-8')
            if not reason and content is not None and fragment:
                native_line = re.fullmatch(r'L(\d+)(?:-L(\d+))?', fragment)
                if native_line:
                    end = int(native_line[2] or native_line[1])
                    if int(native_line[1]) < 1 or end > len(content.splitlines()):
                        reason = 'line anchor outside document'
                elif fragment not in anchors(content):
                    reason = 'heading anchor missing'
            if reason:
                errors.append({'file': name, 'line': line, 'target': target, 'reason': reason})
    return {'format': 'chenyuan-document-links', 'version': 1, **counts, 'errors': errors, 'passed': not errors}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    report = check()
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        with args.report.open('x', encoding='utf-8', newline='\n') as output:
            json.dump(report, output, ensure_ascii=False, indent=2)
            output.write('\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(0 if report['passed'] else 1)
