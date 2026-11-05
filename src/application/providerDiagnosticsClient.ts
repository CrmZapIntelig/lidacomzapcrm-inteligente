export const evolutionStatuses=['DISABLED','NOT_CONFIGURED','CONNECTED','CONNECTING','DISCONNECTED','UNAUTHORIZED','NOT_FOUND','UNAVAILABLE','INVALID_RESPONSE'] as const;
export type EvolutionStatus=typeof evolutionStatuses[number];
export async function fetchEvolutionDiagnostics(token:string,signal:AbortSignal,transport:typeof fetch=fetch):Promise<EvolutionStatus>{
 if(!token)throw Error('Entre novamente para consultar a conexão.');
 const response=await transport('/api/providers/evolution',{method:'GET',headers:{Authorization:`Bearer ${token}`},credentials:'omit',cache:'no-store',redirect:'error',signal});
 if(response.status===401||response.status===403)throw Error('Sua sessão não tem acesso a esta consulta. Entre novamente.');
 if(!response.ok)throw Error('Não foi possível consultar a conexão. Tente novamente.');
 const data=await response.json();
 if(data?.provider!=='WHATSAPP_EVOLUTION_OPTIONAL'||data.canSend!==false||!evolutionStatuses.includes(data.status))throw Error('O serviço retornou uma resposta inválida.');
 return data.status;
}
