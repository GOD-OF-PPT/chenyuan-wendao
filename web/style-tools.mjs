// These tools are explicit reviewed web devDependencies, not runtime imports.
export {default as postcss} from 'postcss';
export {parse as parseVue} from '@vue/compiler-sfc';
export {default as colorNames} from 'color-name';
import selectorParser from 'postcss-selector-parser';
import valueParser from 'postcss-value-parser';

// Compare CSS grammar tokens, preserving quoted text, combinators and conditions.
// Formatting cannot spend new specificity debt or exempt a different drawing.
export function canonicalSelector(selector) {
  const node = n => [n.type, n.type === 'combinator' ? n.value.trim() || ' ' : n.value ?? null,
    n.namespace ?? null, n.attribute ?? null, n.operator ?? null, n.insensitive ?? null,
    n.nodes?.filter(child => child.type !== 'comment').map(node) ?? null];
  return JSON.stringify(node(selectorParser().astSync(selector)));
}

export function canonicalCssValue(value) {
  const word = value => {
    const number = /^([+-]?(?:\d*\.?\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i.exec(value);
    return number ? [Number(number[1]), number[2].toLowerCase()] : value;
  };
  const nodes = rows => rows.filter(n => !['space', 'comment'].includes(n.type))
    .map(n => [n.type, n.type === 'word' ? word(n.value) : n.value, n.nodes ? nodes(n.nodes) : null]);
  return nodes(valueParser(value).nodes);
}
