import {computed,ref,watch,type ComputedRef} from 'vue';
import './art35-study-rest.css';

// Only ownership of image loading lives here. The original renderer owns all game state.
export function useJadePaint(form:ComputedRef<string|undefined>){
 const forms=['heart','blade','scroll','knot','seal','fan','manual'];
 const base=import.meta.env.BASE_URL+'art/v2/study/';
 const cover=computed(()=>forms.includes(form.value??'')?base+form.value+'-v1.webp':'');
 const page=base+'leaf-v1.webp';
 const loaded=ref({cover:false,page:false});
 const ready=computed(()=>loaded.value.cover&&loaded.value.page);
 watch(cover,()=>{loaded.value={cover:false,page:loaded.value.page};});
 function set(event:Event,success:boolean){
  const image=event.currentTarget as SVGImageElement|null;
  const part=image?.dataset.jadePart;
  if(!image||(part!=='cover'&&part!=='page')||image.getAttribute('href')!==(part==='cover'?cover.value:page))return;
  loaded.value={...loaded.value,[part]:success};
 }
 return{cover,page,ready,set};
}
