// Authored SVG paint is not an interface theme. These selectors own drawing
// surfaces, never DOM text, buttons, budgets or focus indications.
const scene = ['.scene-moon','.mountain.far','.mountain.middle','.scene-mist','.mountain.near','.settlement-roofs,.scene-ruins,.scene-pine','.scene-ruins','.scene-gate','.gate-light','.gate-lightning','.photo-door-outline','.photo-lightning'];
const materials = ['.ta08-task-drawing','.ta08-tool-wood','.ta08-tool-metal','.ta08-tool-fiber','.ta08-task-wood','.ta08-task-bronze','.ta08-task-paper','.ta08-task-stone','.ta08-task-jade','.ta08-task-grain','.ta08-task-ink','.ta08-task-inlay'];
const source = ['.ta08-resource-fallback>svg','.ta08-tool-wood','.ta08-tool-metal','.ta08-tool-fiber','.ta08-task-drawing','.ta08-task-wood','.ta08-bag-shell','.ta08-task-bronze','.ta08-task-paper','.ta08-task-stone','.ta08-task-jade','.ta08-task-inlay','.ta08-task-grain','.ta08-task-cord','.ta08-task-ink','.ta08-bag-vessel','.ta08-bag-clasp','.ta08-bag-cord','.ta08-bag-lid','.ta08-bag-lining','.ta08-saved-transfer svg'];
const equipment = ['.ta09-jade-face','.ta09-jade-edge','.ta09-jade-cord','.ta09-jade-rest','.ta09-jade-inlay','.ta09-jade-line','.ta09-jade-motif','.ta09-provisional-engraving:not(.ta09-actual-engraving)','.ta09-jade-tool-tip','.ta09-jade-sealing','.ta09-jade-attuned','.ta09-jade-attuned path+path','.ta09-queue-slip','.ta09-empty-queue svg'];
const paint = selectors => Object.fromEntries(selectors.map(selector=>[selector,['fill','stroke']]));
export const paintedStyleScope = {
 'ScenePanel.vue': {...paint(scene),'.scene-state-layer':['filter'],'.photo-lightning':['stroke','filter']},
 'SourceMaterials.vue': {
  ...paint(materials.map(selector=>'#app .source-field.ta08-field '+selector)),
  '#app .source-field.ta08-field .ta08-resource-tool':['color'],
  '#app .source-field.ta08-field .ta08-task-drawing':['stroke','filter'],
 },
 'RelicInscription.vue': {...paint(['.relic-engraved-path','.relic-sealing','.relic-sealing>path:last-child']),'.relic-workpiece':['filter']},
 'ta08-source.css': {
  ...paint(source),'.ta08-resource-tool':['color'],'.ta08-contact-trace':['color'],
  '.ta08-resource-object[data-source=soul] .ta08-contact-trace':['color'],
  '.ta08-task-drawing':['stroke','filter'],'.ta08-bag-vessel':['stroke','filter'],
  '#app .ta08-task-view:is(:hover,:focus-visible) .ta08-task-drawing':['filter'],
  '#app .ta08-bag-inspect:hover .ta08-bag-vessel':['filter'],
 },
 'ta09-equipment.css': {
  ...paint(equipment),'.ta09-jade-drawing':['filter'],'.ta09-actual-engraving':['filter'],
  '.ta09-jade[data-state=failed] .ta09-jade-drawing':['filter'],
 },
};

export function isPaintedStyle(file,selector,property,normalize=value=>value){
 const key=normalize(selector);
 return Object.entries(paintedStyleScope[file]??{}).some(([candidate,properties])=>normalize(candidate)===key&&properties.includes(property));
}
