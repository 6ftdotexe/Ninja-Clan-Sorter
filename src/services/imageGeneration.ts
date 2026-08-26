import type{GeneratorRequest,GeneratorResponse}from '../types/generator';
export async function generateShinobiImage(payload:GeneratorRequest):Promise<GeneratorResponse>{
 const r=await fetch('/api/generate-shinobi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||`Generation failed (${r.status})`);
 return data as GeneratorResponse;
}
