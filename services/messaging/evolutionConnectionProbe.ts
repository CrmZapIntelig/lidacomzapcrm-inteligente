/** Server-only, read-only Evolution v2 connection probe. Never creates a session or sends.
 * Contract: https://docs.evoapicloud.com/api-reference/instance-controller/connection-state
 * Configuration must come from trusted server deployment, never request parameters.
 */
export interface EvolutionProbeConfig {
  enabled?: boolean;
  tenantId: string;
  baseUrl: string;
  instanceName: string;
  readApiKey: () => Promise<string | undefined>;
  timeoutMs?: number;
}
export type EvolutionConnectionStatus = 'DISABLED' | 'NOT_CONFIGURED' | 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'INVALID_RESPONSE';
export interface EvolutionConnectionReport {
  provider: 'WHATSAPP_EVOLUTION_OPTIONAL';
  status: EvolutionConnectionStatus;
  canSend: false;
}

export function createEvolutionConnectionProbe(config: EvolutionProbeConfig, transport: typeof fetch = fetch) {
  if(typeof window!=='undefined')throw Error('SERVER_ONLY_PROVIDER');
  const settings={...config};
  const base=new URL(settings.baseUrl);
  if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash
    ||!settings.tenantId.trim()||!/^[A-Za-z0-9_-]{1,128}$/.test(settings.instanceName)
    ||(settings.timeoutMs!==undefined&&(!Number.isInteger(settings.timeoutMs)||settings.timeoutMs<1||settings.timeoutMs>30000)))throw Error('INVALID_EVOLUTION_CONFIGURATION');
  const endpoint=base.href.replace(/\/$/,'')+'/instance/connectionState/'+settings.instanceName;
  return async (tenantId:string):Promise<EvolutionConnectionReport>=>{
    if(tenantId!==settings.tenantId)throw Error('EVOLUTION_CONTEXT_MISMATCH');
    const report=(status:EvolutionConnectionStatus):EvolutionConnectionReport=>({provider:'WHATSAPP_EVOLUTION_OPTIONAL',status,canSend:false});
    if(settings.enabled!==true)return report('DISABLED');
    // The same abort deadline covers secret lookup, request and body consumption.
    const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    const timeout=new Promise<EvolutionConnectionReport>(resolve=>{
      timer=setTimeout(()=>{controller.abort();resolve(report('UNAVAILABLE'));},settings.timeoutMs??10000);
    });
    const work=async()=>{
      try{
        const key=await settings.readApiKey();
        if(controller.signal.aborted)return report('UNAVAILABLE');
        if(!key?.trim())return report('NOT_CONFIGURED');
        const response=await transport(endpoint,{method:'GET',headers:{apikey:key,accept:'application/json'},redirect:'error',signal:controller.signal});
        if(response.status===401||response.status===403){await response.body?.cancel();return report('UNAUTHORIZED');}
        if(response.status===404){await response.body?.cancel();return report('NOT_FOUND');}
        if(!response.ok){await response.body?.cancel();return report('UNAVAILABLE');}
        const reader=response.body?.getReader();
        if(!reader)return report('INVALID_RESPONSE');
        const chunks:Uint8Array[]=[];let size=0;
        try{
          while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
            if(size>16384){await reader.cancel();return report('INVALID_RESPONSE');}chunks.push(part.value);}
        }finally{reader.releaseLock();}
        const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
        let body:any;
        try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return report('INVALID_RESPONSE');}
        if(body?.instance?.instanceName!==settings.instanceName)return report('INVALID_RESPONSE');
        switch(body.instance.state){
          case 'open':return report('CONNECTED');
          case 'connecting':return report('CONNECTING');
          case 'close':case 'refused':return report('DISCONNECTED');
          default:return report('INVALID_RESPONSE');
        }
      }catch{return report('UNAVAILABLE');}
    };
    try{return await Promise.race([work(),timeout]);}finally{clearTimeout(timer!);}
  };
}
