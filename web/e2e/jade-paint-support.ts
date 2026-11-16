import {readFileSync} from 'node:fs';
import type {Page} from '@playwright/test';

const facts=JSON.parse(readFileSync(new URL('../../art/production/art35/export-facts.json',import.meta.url),'utf8'));
const assets=Object.fromEntries(facts.assets.map((r:any)=>[r.runtime.path.split('/').at(-1),r.runtime]));

// Measure the current raster's actual alpha footprint, through its original SVG transforms.
export async function jadePaintGeometry(page:Page){
 return page.getByTestId('jade-engraving').evaluate((root,assets)=>{
  const ready=root.getAttribute('data-painted')==='true';
  const images=ready?[...root.querySelectorAll<SVGImageElement>('image[data-jade-part]')].map(image=>{
   const href=image.getAttribute('href')!,asset=assets[href.split('/').at(-1)!];
   if(!asset||!href.endsWith('/art/v2/study/'+asset.path.split('/').at(-1)))throw Error('Unrecorded current jade raster');
   const b=image.getBBox(),m=image.getScreenCTM()!,size=asset.dimensions,alpha=asset.alphaBBox16;
   const scale=Math.min(b.width/size.width,b.height/size.height),x=b.x+(b.width-size.width*scale)/2,y=b.y+(b.height-size.height*scale)/2;
   const corners=[[alpha[0],alpha[1]],[alpha[2],alpha[1]],[alpha[0],alpha[3]],[alpha[2],alpha[3]]].map(([a,b])=>new DOMPoint(x+a*scale,y+b*scale).matrixTransform(m));
   const left=Math.min(...corners.map(p=>p.x)),right=Math.max(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y)),bottom=Math.max(...corners.map(p=>p.y));
   let visible=true;for(let p:Element|null=image;p&&p!==root;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0)visible=false;}
   return{part:image.dataset.jadePart!,asset:asset.path,visible,box:{left,right,top,bottom,width:right-left,height:bottom-top}};
  }):[];
  return{ready,images};
 },assets);
}
