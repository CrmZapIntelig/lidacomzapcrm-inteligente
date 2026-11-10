import type {EvolutionConnectionReport} from './evolutionConnectionProbe';

export interface DiagnosticsIdentity { uid:string; email_verified?:boolean }
export interface DiagnosticsRequest { method:string; authorization?:string; hasQuery:boolean; hasBody:boolean }
export interface DiagnosticsResponse { status:number; headers:Record<string,string>; body:unknown }
/** Server boundary. Bind verifyIdToken to Admin Auth with checkRevoked=true.
 * Tenant, operator and probe come from trusted deployment, never client input.
 * This endpoint is read-only and is not an outbound authorization endpoint.
 */
export function createProviderDiagnostics(dependencies:{
  tenantId:string; operatorUid:string;
  verifyIdToken:(token:string,checkRevoked:true)=>Promise<DiagnosticsIdentity>;
  evolution:(tenantId:string)=>Promise<EvolutionConnectionReport>;
}){
  const config={...dependencies};
  if(!config.tenantId.trim()||!config.operatorUid.trim())throw Error('DIAGNOSTICS_CONFIGURATION_INVALID');
  return async(request:DiagnosticsRequest):Promise<DiagnosticsResponse>=>{
    const response=(status:number,body:unknown)=>({status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json'},body});
    if(request.method!=='GET')return response(405,{error:'METHOD_NOT_ALLOWED'});
    if(request.hasQuery||request.hasBody)return response(400,{error:'UNEXPECTED_INPUT'});
    const match=/^Bearer ([A-Za-z0-9_.-]{1,8192})$/.exec(request.authorization??'');
    if(!match)return response(401,{error:'AUTHENTICATION_REQUIRED'});
    let identity:DiagnosticsIdentity;
    try{identity=await config.verifyIdToken(match[1],true);}catch{return response(401,{error:'AUTHENTICATION_REQUIRED'});}
    if(identity?.uid!==config.operatorUid||identity.email_verified!==true)return response(403,{error:'ACCESS_DENIED'});
    try{
      const result=await config.evolution(config.tenantId);
      if(result.provider!=='WHATSAPP_EVOLUTION_OPTIONAL'||result.canSend!==false||!['DISABLED','NOT_CONFIGURED','CONNECTED','CONNECTING','DISCONNECTED','UNAUTHORIZED','NOT_FOUND','UNAVAILABLE','INVALID_RESPONSE'].includes(result.status))throw Error('INVALID_PROBE_RESULT');
      // Rebuild the response: even an accidental upstream field must not disclose credentials.
      return response(200,{provider:result.provider,status:result.status,canSend:false});
    }catch{return response(503,{error:'DIAGNOSTICS_UNAVAILABLE'});}
  };
}
