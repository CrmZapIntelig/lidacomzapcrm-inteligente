/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FunnelStage =
  | 'Rascunho'
  | 'Lead'
  | 'Em atendimento'
  | 'Pedido gerado'
  | 'Aguardando pagamento'
  | 'Pago'
  | 'Produção'
  | 'Entregue'
  | 'Fechado'
  | 'Pós-venda';

export type UserRole = 'administrador' | 'caixa' | 'cozinha' | 'atendimento' | 'entregador';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
}

export interface AuthSession {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface CaixaTransaction {
  id: string;
  type: 'entrada' | 'saida' | 'sangria';
  value: number;
  description: string;
  method?: 'Pix' | 'Cartão' | 'Dinheiro' | 'Crédito Interno';
  orderId?: string;
  timestamp: string;
}

export interface CaixaSession {
  id: string;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  currentBalance: number;
  status: 'aberto' | 'fechado';
  transactions: CaixaTransaction[];
}

export interface FunnelStageConfig {
  id: FunnelStage;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export type ContactType = 'salvo' | 'nao_salvo' | 'grupo' | 'bloqueado';

export type Channel = 'whatsapp' | 'rcs' | 'ambos' | 'delivery' | 'balcao' | 'mesa_qr';

export interface Message {
  id: string;
  sender: 'cliente' | 'operador' | 'sistema';
  text: string;
  timestamp: string;
  type?: 'text' | 'image' | 'audio' | 'file';
  mediaUrl?: string; // simulation placeholder
  duration?: string; // for audio
  fileName?: string; // for physical file
  channel?: Channel; 
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  type: ContactType;
  stage: FunnelStage;
  tags: string[];
  totalBought: number;
  lastPurchaseDate?: string;
  notes: string[];
  dispatched: boolean; // flag for Disparador
  avatarColor: string;
  channel?: Channel; // Origem
}

export interface HistoryEvent {
  id: string;
  clientId: string;
  type: 'stage_change' | 'msg_sent' | 'msg_received' | 'order_created' | 'tag_added' | 'note_added' | 'campaign_dispatched' | 'system_alert';
  title: string;
  description: string;
  timestamp: string;
  operatorName?: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'Pix' | 'Cartão de Crédito' | 'Boleto' | 'Dinheiro' | 'PicPay';
  status: 'Pendente' | 'Pago' | 'Cancelado';
  createdAt: string;
  notes?: string;
  channel?: Channel; 
}

export interface Campaign {
  id: string;
  name: string;
  messageTemplate: string;
  sentCount: number;
  responseCount: number;
  status: 'rascunho' | 'ativo' | 'concluido' | 'pausado';
  createdAt: string;
  lastRun?: string;
  channel?: Channel; 
}

export interface AppSettings {
  dailyLimit: number;
  intervalMin: number; // in seconds
  intervalMax: number; // in seconds
  autoPause: boolean;
  autoPauseAfter: number; // count
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  waSessionStatus: 'connected' | 'disconnected' | 'connecting';
  operatorRole: 'Admin' | 'Sales' | 'Marketing';
  operatorName: string;
  theme: 'light' | 'dark';
}

export interface AutomationRule {
  id: string;
  triggerEvent: string;
  actionStage: FunnelStage;
  active: boolean;
  title: string;
  description: string;
}

export interface MenuItemSize {
  label: string;
  price: number;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItemUtensil {
  id: string;
  name: string;
  price: number;
}

export interface ProductDigitalMenu {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number; // base price
  tamanhos: MenuItemSize[];
  adicionais: MenuItemAddon[];
  naoMandar: string[]; // e.g. ["Retirar Cebola", "Retirar Tomate"]
  utensilios: MenuItemUtensil[];
}

export interface Cardapio {
  id: string;
  name: string;
  description: string;
  imageBanner: string;
  availableHours: string;
  active: boolean;
  productIds: string[]; // reference ids of ProductDigitalMenu
  createdAt: string;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  zipCode: string;
  email?: string;
  changeFor?: string;
}

export interface DeliveryOrderItem {
  productId: string;
  productName: string;
  selectedSize: string; // "P", "M", "G" etc
  selectedSizePrice: number;
  selectedAddons: MenuItemAddon[];
  removedItems: string[]; // from the list of things to remove "Não mandar"
  selectedUtensils: MenuItemUtensil[];
  quantity: number;
  observation?: string;
  subtotal: number;
}

export interface DeliveryOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'Pix' | 'Cartão' | 'Dinheiro';
  status: 'PEDIDO GERADO' | 'PRODUÇÃO' | 'PRONTO' | 'EM ENTREGA' | 'FECHADO';
  createdAt: string;
  deliveryTime: string; // e.g. "20:30" or "Agendado para amanhã"
  address: DeliveryAddress;
  notes?: string;
  channel?: Channel; 
}

export interface MesaConfig {
  id: string;
  numero: string;
  status: 'Livre' | 'Ocupada' | 'Pedido Aberto' | 'Em Produção' | 'Fechamento Conta' | 'Finalizada';
  qrCodeUrl: string;
  active: boolean;
}

export interface ComandaItem extends DeliveryOrderItem {
  status: 'pendente' | 'preparando' | 'entregue' | 'cancelado';
}

export interface ComandaLocal {
  id: string;
  mesaId: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  items: ComandaItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: 'aberta' | 'fechada' | 'cancelada';
  createdAt: string;
  closedAt?: string;
  payments: {
    method: 'Pix' | 'Cartão' | 'Dinheiro' | 'Crédito Interno';
    amount: number;
    date: string;
  }[];
}

// Operational Tables Schemas (Cozinha, Produção, Entregas)
export interface CozinhaItem {
  id: string;
  orderId: string;
  clientName: string;
  items: string[]; // Concatenated item list or simple strings
  status: 'aguardando' | 'preparando' | 'pronto';
  notes?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FilaPreparo {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  priority: 'baixa' | 'normal' | 'alta';
  estimatedTimeMin: number;
  elapsedTimeSec: number;
}

export interface StatusOperacional {
  isOpen: boolean; // Is the kitchen open?
  pendingCount: number;
  preparingCount: number;
  finishedToday: number;
  avgPreparationTimeSec: number;
  lastOrderReceivedTime?: string;
}

// Operational Tables Schemas (Entregadores, Rotas, Rastreamento)
export type VehicleType = 'moto' | 'carro' | 'bicicleta';
export type CourierStatus = 'Disponível' | 'Em entrega' | 'Pausado' | 'Offline';
export type RouteStatusStep = 
  | 'Aguardando Entregador'
  | 'Entregador Aceitou'
  | 'Indo Retirada'
  | 'Pedido Coletado'
  | 'Em Rota'
  | 'Pedido Entregue';

export interface Courier {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  vehicle: string;
  plate: string;
  photo: string;
  vehicleType: VehicleType;
  status: CourierStatus;
  activeOrders: string[];
  rating: number;
  avgDeliveryTime: string; // e.g. "22 min"
  lastLocation: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface DeliveryRoute {
  id: string;
  orderId: string;
  courierId?: string;
  status: RouteStatusStep;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  currentLat: number;
  currentLng: number;
  remainingTime: string; // e.g. "12 min"
  remainingDistance: string; // e.g. "3.4 km"
  speedKmh: number;
  historyCoords: { lat: number; lng: number }[];
  alerts: string[];
  updatedAt: string;
}

export interface CourierReview {
  id: string;
  courierId: string;
  rating: number;
  comment: string;
  date: string;
}

export interface DeliveryHistory {
  id: string;
  orderId: string;
  courierId: string;
  courierName: string;
  clientName: string;
  totalWithFee: number;
  deliveredAt: string;
  status: 'SUCESSO' | 'ATRASADO' | 'CANCELADO';
  avgSpeed: number;
}

// Central Inteligente Types
export interface WhatsappTemplate {
  id: string;
  name: string;
  category: 'vendas' | 'entrega' | 'cobrança' | 'marketing' | 'pós-venda' | 'recuperação' | 'aniversário';
  content: string;
  active: boolean;
  createdAt: string;
}

export type AutomationTrigger = 
  | 'nova conversa' | 'mensagem recebida' | 'mensagem enviada' | 'cliente respondeu' 
  | 'pedido criado' | 'pagamento aprovado' | 'pedido entregue' | 'cliente inativo' 
  | 'carrinho abandonado' | 'entrega atrasada' | 'lead parado' | 'novo lead' 
  | 'cliente VIP' | 'primeira compra' | 'aniversário cliente';

export type AutomationAction = 
  | 'enviar WhatsApp' | 'mover funil' | 'adicionar tag' | 'remover tag' 
  | 'criar tarefa' | 'gerar cupom' | 'enviar cardápio' | 'enviar cobrança PIX' 
  | 'criar observação' | 'acionar entregador' | 'gerar alerta';

export interface AutomationFlowRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  actionDetails?: string; 
  active: boolean;
}

export interface AutomationLog {
  id: string;
  type: 'automação' | 'mensagem' | 'erro' | 'pedido' | 'pagamento' | 'webhook' | 'fila';
  title: string;
  description: string;
  date: string;
}

export interface ChatbotNode {
  id: string;
  label: string;
  type: 'saudação' | 'cardápio' | 'status' | 'rastreamento' | 'atendimento' | 'pagamento' | 'entrega';
  content: string;
  options: { label: string; nextNodeId: string }[];
}



