import meta from '../.generated/demo-meta';
import {demoSpec,validateDemoNode,type DemoId} from '../../src/demo.ts';
export function requestedDemo(search:string):DemoId|null{
 const params=new URLSearchParams(search);if(!params.has('demo'))return null;const ids=params.getAll('demo');if(ids.length!==1)throw new Error('演示入口不明确，请从菜单重新选择。');return demoSpec(ids[0]).id;
}
export async function loadDemo(id:DemoId){
 const spec=meta.nodes.find(node=>node.id===id);if(!spec)throw new Error('演示节点未打包。');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{
 const response=await fetch(new URL('demo-nodes/'+spec.path,document.baseURI),{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('演示节点读取失败，请通过本机HTTP服务运行候选包。');
 if(new URL(response.url).origin!==location.origin||!response.body)throw new Error('演示节点响应来源无效。');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>spec.bytes)throw new Error('演示节点响应超出已核对大小。');chunks.push(value);}}catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
 if(size!==spec.bytes)throw new Error('演示节点文件不完整。');const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');if(digest!==spec.sha256)throw new Error('演示节点校验失败，未打开任何游戏存档。');
 return validateDemoNode(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),id,meta.sourceDigest);
 }catch(error){if(error instanceof Error&&error.name==='AbortError')throw new Error('演示节点读取超时，请重新载入此入口。');throw error;}finally{clearTimeout(timer);}
}
export function normalLink(){const url=new URL(location.href);url.searchParams.delete('demo');url.hash='';return url.pathname+url.search;}
export function demoLink(id:DemoId){const url=new URL(normalLink(),location.origin);url.searchParams.set('demo',id);return url.pathname+url.search;}
