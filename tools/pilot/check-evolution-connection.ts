import {createEvolutionConnectionProbe} from '../../services/messaging/evolutionConnectionProbe';

// Server/CLI only. Never put these settings in VITE_* or browser configuration.
async function main(){
  const tenantId=process.env.EVOLUTION_TENANT_ID;
  const baseUrl=process.env.EVOLUTION_BASE_URL;
  const instanceName=process.env.EVOLUTION_INSTANCE_NAME;
  if(!tenantId||!baseUrl||!instanceName||!process.env.EVOLUTION_API_KEY?.trim()){
    console.log(JSON.stringify({provider:'WHATSAPP_EVOLUTION_OPTIONAL',status:'NOT_CONFIGURED',canSend:false}));
    process.exitCode=2;return;
  }
  const probe=createEvolutionConnectionProbe({tenantId,baseUrl,instanceName,enabled:true,readApiKey:async()=>process.env.EVOLUTION_API_KEY});
  const result=await probe(tenantId);
  console.log(JSON.stringify({...result,checkedAt:new Date().toISOString()}));
  if(result.status!=='CONNECTED')process.exitCode=2;
}
main().catch(()=>{console.error('EVOLUTION_PROBE_FAILED');process.exitCode=1;});
