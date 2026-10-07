export function buildPilotRulesCases() {
const actors={anonymous:null,authenticated:{uid:'TEST-unapproved',token:{}},frontendAdmin:{uid:'TEST-unapproved',token:{role:'administrador'}},otherTenant:{uid:'TEST-other',token:{pilotOrganizationId:'other-TEST',pilotOperator:true,legacyOperator:true}},pilot:{uid:'TEST-pilot',token:{pilotOrganizationId:'prato-mineiro',pilotOperator:true}},legacy:{uid:'TEST-legacy',token:{pilotOrganizationId:'prato-mineiro',pilotOperator:true,legacyOperator:true}}};
const collections=['clients','messages','history','cardapios','productsDigitalMenu','orders','deliveryOrders','settings','caixaSessions','operationalCanaryAudit','unknown-TEST'];
const cases=[],groups={};
function add(group,actor,path,method,allowed,data={id:'TEST-doc',name:'Cliente TEST Exemplo',clientId:'TEST-contact'}){const request={path:'/databases/(default)/documents/'+path,method,time:new Date().toISOString()};if(actors[actor])request.auth=actors[actor];cases.push({expectation:allowed?'ALLOW':'DENY',request,resource:{data},...(method==='create'||method==='update'?{request: {...request,resource:{data}}}:{}),pathEncoding:'PLAIN',expressionReportLevel:'NONE'});groups[group]=(groups[group]||0)+1;}
for(const actor of Object.keys(actors))for(const collection of collections)for(const method of ['get','list','create','update','delete']){
 let allow=false;const isOperator=['pilot','legacy'].includes(actor),isLegacy=actor==='legacy';
 if(collection==='clients')allow=isOperator&&method!=='delete';
 else if(collection==='messages')allow=isOperator&&['get','list'].includes(method);
 else if(collection==='history')allow=isOperator&&['get','list','create'].includes(method);
 else if(['cardapios','productsDigitalMenu','orders','deliveryOrders','settings'].includes(collection))allow=isOperator&&(['get','list'].includes(method)||isLegacy);
 else if(collection!=='operationalCanaryAudit')allow=isLegacy;
 add('access-matrix',actor,collection+'/TEST-doc',method,allow);
}
for(const actor of Object.keys(actors))for(const col of ['clients','messages','history','cardapios','orders','settings','operationalCanaryAudit','pilotPublicMenus'])for(const method of ['get','create','delete'])add('protected-descendants',actor,col+'/TEST-doc/TEST-child/TEST-doc',method,false);
const publicDoc={id:'TEST-doc',name:'Cardápio TEST',description:'Demonstração',products:[],published:true};
for(const actor of Object.keys(actors))for(const method of ['get','list','create','update','delete'])add('public-projection',actor,'pilotPublicMenus/TEST-doc',method,method==='get',publicDoc);
for(const data of [{...publicDoc,published:false},{...publicDoc,apiToken:'TEST-placeholder-not-secret'},{...publicDoc,id:'other-TEST'},{...publicDoc,products:'invalid'}])add('public-invalid', 'anonymous','pilotPublicMenus/TEST-doc','get',false,data);
for(const data of [{id:'other-TEST',name:'Cliente TEST'},{id:'TEST-doc',name:''},{id:'TEST-doc',name:1}])add('invalid-client', 'pilot','clients/TEST-doc','create',false,data);

return { cases, groups };
}