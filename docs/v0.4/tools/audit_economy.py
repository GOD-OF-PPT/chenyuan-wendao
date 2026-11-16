"""Static documentation calculation, NOT a game-engine replay or balance proof."""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[1]

def calculate():
    data = json.loads((ROOT / 'data/economy-snapshot.json').read_text(encoding='utf-8'))
    ranks = [realm['id'] for realm in data['realms']]
    rows, plans = [], []
    for realm in data['realms']:
        work, recipe = realm['work'], data['recipes'][realm['recipe']]
        assert work['stones'] > 0 and work['months'] > 0
        for item, quantity in recipe['inputs'].items():
            assert item in data['materials'] and quantity > 0
            assert ranks.index(data['materials'][item]['min']) <= ranks.index(realm['id'])
        rate = work['stones'] / work['months']
        input_price = sum(data['materials'][item]['buy'] * n for item, n in recipe['inputs'].items()) + recipe['fee']
        rows.append({'realm': realm['name'], 'naturalSteps': math.ceil(realm['xpCap']/realm['baseYield']),
                     'stonesPerGameMonth': round(rate, 6), 'assistedCostInWorkMonths': round(20/rate, 6),
                     'buyInputsPlusFee': input_price, 'buyProduct': recipe['buy']})
        for strategy in ('gather-craft', 'buy-inputs-craft', 'buy-product'):
            material_months = material_xp = 0
            leftover = {}
            if strategy == 'gather-craft':
                for item, n in recipe['inputs'].items():
                    source = data['materials'][item]['source']
                    steps = math.ceil(n / source['units'])
                    material_months += steps * source['months']
                    material_xp += steps * source['xp']
                    leftover[item] = steps * source['units'] - n
                fixed_cash = recipe['fee']
            else:
                fixed_cash = recipe['buy'] if strategy == 'buy-product' else input_price
            craft_months = 0 if strategy == 'buy-product' else recipe['months']
            for method in ('natural','assisted'):
                per_step = realm['baseYield'] * (data['cultivation']['assistedMultiplier'] if method == 'assisted' else 1)
                fee = data['cultivation']['assistedCost'] if method == 'assisted' else 0
                candidates = []
                # Finite exhaustive work count within a fixed strategy, not an all-actions optimizer.
                for work_steps in range(2001):
                    need_xp = max(0, realm['xpCap'] - material_xp - work_steps * work['xp'])
                    cultivation_steps = math.ceil(need_xp / per_step)
                    cash = work_steps * work['stones'] - fixed_cash - cultivation_steps * fee
                    if cash >= 0:
                        months = material_months + craft_months + work_steps * work['months'] + cultivation_steps
                        candidates.append((months, work_steps, cultivation_steps, cash))
                if not candidates:
                    raise ValueError(f'No feasible plan: {realm["id"]}/{strategy}/{method}')
                months, work_steps, cultivation_steps, cash = min(candidates)
                assert material_xp + work_steps*work['xp'] + cultivation_steps*per_step >= realm['xpCap']
                assert cash >= 0
                plans.append({'realm':realm['name'],'strategy':strategy,'cultivation':method,
                              'gameMonths':months,'workSteps':work_steps,'cultivationSteps':cultivation_steps,
                              'remainingStones':cash,'remainingMaterials':leftover})
    for item in data['materials'].values():
        assert 0 <= item['sell'] < item['buy']
    assert rows[0]['buyInputsPlusFee'] == 130 and rows[0]['buyProduct'] == 160
    return {'scope':'static selected-config audit; NOT gameplay tests', 'sourceCommit':data['provenance']['commit'],
            'limitations':data['limitations'],'rows':rows,'fixedStrategyPlans':plans}

if __name__ == '__main__':
    print(json.dumps(calculate(), ensure_ascii=False, indent=2))
