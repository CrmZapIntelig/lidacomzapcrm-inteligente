/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Message, HistoryEvent, Order, Campaign, AutomationRule, AppSettings, FunnelStageConfig, ProductDigitalMenu, Cardapio, DeliveryOrder } from '../types';

export const FUNNEL_STAGES: FunnelStageConfig[] = [
  { id: 'Rascunho', label: 'Rascunho', color: 'text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800/50', borderColor: 'border-slate-300 dark:border-slate-700' },
  { id: 'Lead', label: 'Lead', color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-950/20', borderColor: 'border-sky-300 dark:border-sky-800' },
  { id: 'Em atendimento', label: 'Em Atendimento', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/20', borderColor: 'border-amber-300 dark:border-amber-800' },
  { id: 'Pedido gerado', label: 'Pedido Gerado', color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950/20', borderColor: 'border-indigo-300 dark:border-indigo-800' },
  { id: 'Aguardando pagamento', label: 'Aguardando Pgto', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950/20', borderColor: 'border-orange-300 dark:border-orange-850' },
  { id: 'Pago', label: 'Pago', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950/20', borderColor: 'border-emerald-300 dark:border-emerald-800' },
  { id: 'Produção', label: 'Produção', color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950/20', borderColor: 'border-violet-300 dark:border-violet-850' },
  { id: 'Entregue', label: 'Entregue', color: 'text-teal-500', bgColor: 'bg-teal-50 dark:bg-teal-950/20', borderColor: 'border-teal-300 dark:border-teal-800' },
  { id: 'Fechado', label: 'Fechado', color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950/20', borderColor: 'border-rose-300 dark:border-rose-800' },
  { id: 'Pós-venda', label: 'Pós-Venda', color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/20', borderColor: 'border-fuchsia-300 dark:border-fuchsia-850' },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Ana Silva Mendonça',
    phone: '(11) 98765-4321',
    type: 'salvo',
    stage: 'Em atendimento',
    tags: ['Vip', 'Interesse Alto', 'Moda Feminina'],
    totalBought: 750.90,
    lastPurchaseDate: '2026-05-18',
    notes: ['Gosta de envio via Sedex rápida.', 'Prefere cores neutras e tamanhos M.'],
    dispatched: false,
    avatarColor: 'bg-emerald-500',
    channel: 'whatsapp'
  },
  {
    id: '2',
    name: 'Carlos Eduardo Santos',
    phone: '(21) 99234-5678',
    type: 'salvo',
    stage: 'Pedido gerado',
    tags: ['Cliente Novo', 'Buscando Desconto'],
    totalBought: 0.00,
    lastPurchaseDate: undefined,
    notes: ['Enviado catálogo de inverno.', 'Solicitou entrega para o Rio de Janeiro.'],
    dispatched: false,
    avatarColor: 'bg-indigo-500',
    channel: 'rcs'
  },
  {
    id: '3',
    name: 'Mariana Costa Ferreira',
    phone: '(31) 97112-4455',
    type: 'salvo',
    stage: 'Pago',
    tags: ['Recorrente', 'Atacado'],
    totalBought: 3200.00,
    lastPurchaseDate: '2026-05-24',
    notes: ['Distribuidora licenciada.', 'Pagamentos recorrentes via Pix.'],
    dispatched: true,
    avatarColor: 'bg-teal-500',
    channel: 'ambos'
  },
  {
    id: '4',
    name: '(11) 98888-7766',
    phone: '(11) 98888-7766',
    type: 'nao_salvo',
    stage: 'Lead',
    tags: ['Lead Digital', 'Origem Instagram'],
    totalBought: 0.00,
    lastPurchaseDate: undefined,
    notes: ['Contatou pedindo lista de preços.', 'Análise pendente.'],
    dispatched: false,
    avatarColor: 'bg-amber-600',
    channel: 'whatsapp'
  },
  {
    id: '5',
    name: 'Grupo de Lojistas de Calçados 👠',
    phone: 'group-10294951',
    type: 'grupo',
    stage: 'Rascunho',
    tags: ['Grupos de Vendas'],
    totalBought: 0.00,
    dispatched: false,
    notes: ['Não enviar disparos em massa aqui para evitar banimento.'],
    avatarColor: 'bg-blue-500',
    channel: 'whatsapp'
  },
  {
    id: '6',
    name: 'Felipe Antunes (Bloqueado)',
    phone: '(19) 99341-2299',
    type: 'bloqueado',
    stage: 'Fechado',
    tags: ['Sem Interesse', 'Spam'],
    totalBought: 0.00,
    notes: ['Solicitou exclusão da lista de contatos.'],
    dispatched: false,
    avatarColor: 'bg-slate-400',
    channel: 'rcs'
  },
  {
    id: '7',
    name: 'Daniele Albuquerque',
    phone: '(11) 94239-1090',
    type: 'salvo',
    stage: 'Aguardando pagamento',
    tags: ['Gera Boleto', 'Aguardando Confirmar'],
    totalBought: 120.00,
    lastPurchaseDate: '2026-01-10',
    notes: ['Boleto vence no dia seguinte.'],
    dispatched: false,
    avatarColor: 'bg-rose-500',
    channel: 'whatsapp'
  },
  {
    id: '8',
    name: 'Bruno Lima Fonseca',
    phone: '(41) 98877-2233',
    type: 'salvo',
    stage: 'Produção',
    tags: ['Personalizado'],
    totalBought: 450.00,
    lastPurchaseDate: '2026-05-25',
    notes: ['Pedido com estampa personalizada de logo corporativo.'],
    dispatched: false,
    avatarColor: 'bg-purple-500',
    channel: 'rcs'
  },
  {
    id: '9',
    name: 'Letícia Vasconcelos',
    phone: '(81) 98111-5544',
    type: 'salvo',
    stage: 'Entregue',
    tags: ['Moda Praia'],
    totalBought: 590.00,
    lastPurchaseDate: '2026-05-15',
    notes: ['Entregue via transportadora Jadlog.'],
    dispatched: false,
    avatarColor: 'bg-pink-500',
    channel: 'whatsapp'
  },
  {
    id: '10',
    name: 'Renato Siqueira Alves',
    phone: '(11) 97000-8811',
    type: 'salvo',
    stage: 'Pós-venda',
    tags: ['Pós-Venda Ativo', 'Pesquisa Satisfação'],
    totalBought: 1450.00,
    lastPurchaseDate: '2026-05-10',
    notes: ['Enviado cupom de 10% para próxima compra.'],
    dispatched: true,
    avatarColor: 'bg-yellow-500',
    channel: 'rcs'
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1_1', sender: 'cliente', text: 'Boa tarde! Gostaria de saber mais sobre as blusas de algodão.', timestamp: '14:20', channel: 'whatsapp' },
    { id: 'm1_2', sender: 'operador', text: 'Olá, Ana! Tudo bem? Claro! Temos cores branca, preta e areia no tamanho M disponível.', timestamp: '14:22', channel: 'whatsapp' },
    { id: 'm1_3', sender: 'cliente', text: 'Ah, ótimo! Vocês entregam no bairro Jardins em SP?', timestamp: '14:24', channel: 'whatsapp' },
    { id: 'm1_4', sender: 'operador', text: 'Sim, entregamos! O frete convencional fica R$ 12,00 ou R$ 20,00 via motoboy no mesmo dia.', timestamp: '14:26', channel: 'whatsapp' },
  ],
  '2': [
    { id: 'm2_1', sender: 'cliente', text: 'Gostaria de fechar o pedido da jaqueta puffer tamanho G.', timestamp: '11:05', channel: 'rcs' },
    { id: 'm2_2', sender: 'operador', text: 'Perfeito, Carlos! Vou gerar o link do seu pedido agora para você concluir o pagamento, combinado?', timestamp: '11:10', channel: 'rcs' },
  ],
  '3': [
    { id: 'm3_1', sender: 'cliente', text: 'Já fiz o Pix do lote atacado de calçados de maio.', timestamp: '09:00', channel: 'whatsapp' },
    { id: 'm3_2', sender: 'operador', text: 'Recebido aqui, Mariana! Já encaminhei para nosso centro de faturamento. Muito obrigado pela parceria!', timestamp: '09:12', channel: 'whatsapp' },
  ],
  '4': [
    { id: 'm4_1', sender: 'cliente', text: 'Quero saber se o frete de vcs é grátis acima de 200 reais.', timestamp: '15:15', channel: 'whatsapp' },
  ],
  '7': [
    { id: 'm7_1', sender: 'operador', text: 'Olá Daniele! Segue o boleto ref. ao kit de cosméticos. Qualquer dúvida estou à disposição.', timestamp: '10:00', channel: 'whatsapp' },
  ],
  '8': [
    { id: 'm8_1', sender: 'cliente', text: 'Conseguimos alterar a arte da logo de azul para verde floresta?', timestamp: '16:01', channel: 'rcs' },
    { id: 'm8_2', sender: 'operador', text: 'Conseguimos sim Bruno! Ajustado no sistema do projeto.', timestamp: '16:15', channel: 'rcs' },
  ],
  '9': [
    { id: 'm9_1', sender: 'cliente', text: 'Chegou tudo impecável aqui! Amando os biquínis.', timestamp: '12:30', channel: 'whatsapp' },
    { id: 'm9_2', sender: 'operador', text: 'Que alegria, Letícia! Depois marca a gente no insta pra ganhar mimo hehe.', timestamp: '12:35', channel: 'whatsapp' },
  ]
};

export const INITIAL_HISTORY: HistoryEvent[] = [
  { id: 'h1', clientId: '1', type: 'stage_change', title: 'Mudança de Funil', description: 'Alterado de Lead para Em atendimento', timestamp: '2026-05-26T14:22:00Z', operatorName: 'Thiago Admin' },
  { id: 'h2', clientId: '1', type: 'note_added', title: 'Nota Adicionada', description: 'Adicionado lembrete sobre preferência por cores neutras e M.', timestamp: '2026-05-26T14:28:00Z', operatorName: 'Thiago Admin' },
  { id: 'h3', clientId: '2', type: 'stage_change', title: 'Funil Atualizado', description: 'Lead movido para Pedido gerado', timestamp: '2026-05-26T11:10:00Z', operatorName: 'Lucas Vendas' },
  { id: 'h4', clientId: '3', type: 'order_created', title: 'Pedido Pago', description: 'Pedido de Lote de Calçados Atacado gerado com sucesso. Valor: R$ 3.200,00', timestamp: '2026-05-24T09:15:00Z', operatorName: 'Lucas Vendas' },
  { id: 'h5', clientId: '3', type: 'stage_change', title: 'Aprovação de Pagamento', description: 'Etapa atualizada para Pago', timestamp: '2026-05-24T09:16:00Z', operatorName: 'Sistema Automático' },
  { id: 'h6', clientId: '8', type: 'stage_change', title: 'Pedido para Produção', description: 'Etapa atualizada para Produção após aprovação.', timestamp: '2026-05-25T16:20:00Z', operatorName: 'Clara Produção' },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    name: 'Lançamento de Inverno ❄️',
    messageTemplate: 'Olá {cliente}! Tudo bem? Nosso catálogo de inverno acaba de sair do forno com peças incríveis em linho. Quer dar uma olhada e garantir frete grátis usando o cupom INVERNO10?',
    sentCount: 145,
    responseCount: 68,
    status: 'concluido',
    createdAt: '2026-05-15T12:00:00Z',
    lastRun: '2026-05-15T16:30:00Z'
  },
  {
    id: 'c2',
    name: 'Recuperação de Boleto Gerado 📉',
    messageTemplate: 'Oi {cliente}, passando para lembrar que seu boleto com desconto especial vence hoje. Se tiver qualquer dúvida sobre o pedido, me chame aqui!',
    sentCount: 42,
    responseCount: 22,
    status: 'ativo',
    createdAt: '2026-05-20T10:00:00Z',
    lastRun: '2026-05-26T10:00:00Z'
  },
  {
    id: 'c3',
    name: 'Campanha Dia dos Namorados ❤️',
    messageTemplate: 'Olá {cliente}! Procurando o presente ideal para a pessoa amada? Garanta nosso combo namorados com acabamento personalizado. Responda SIM e eu te envio a lista agora.',
    sentCount: 0,
    responseCount: 0,
    status: 'rascunho',
    createdAt: '2026-05-26T21:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'PED-1024',
    clientId: '3',
    clientName: 'Mariana Costa Ferreira',
    items: [
      { id: 'item_1_1', productName: 'Lote Atacado Calçados Sandálias Verão', price: 1600.00, quantity: 2 }
    ],
    total: 3200.00,
    paymentMethod: 'Pix',
    status: 'Pago',
    createdAt: '2026-05-24T09:12:00Z',
    notes: 'Envio prioritário via Sedex.'
  },
  {
    id: 'PED-1025',
    clientId: '8',
    clientName: 'Bruno Lima Fonseca',
    items: [
      { id: 'item_2_1', productName: 'Caneca Cerâmica Personalizada Corretor', price: 45.00, quantity: 10 }
    ],
    total: 450.00,
    paymentMethod: 'Pix',
    status: 'Pago',
    createdAt: '2026-05-25T15:50:00Z',
    notes: 'Arte fornecida pelo WhatsApp.'
  },
  {
    id: 'PED-1026',
    clientId: '7',
    clientName: 'Daniele Albuquerque',
    items: [
      { id: 'item_3_1', productName: 'Kit Cremes Anti-age SkinCare', price: 120.00, quantity: 1 }
    ],
    total: 120.00,
    paymentMethod: 'Boleto',
    status: 'Pendente',
    createdAt: '2026-05-26T09:44:00Z',
    notes: 'Aguardando compensação do banco.'
  },
  {
    id: 'PED-1027',
    clientId: '1',
    clientName: 'Ana Silva Mendonça',
    items: [
      { id: 'item_4_1', productName: 'Jaqueta Blazer Couro Ecológico', price: 349.90, quantity: 2 },
      { id: 'item_4_2', productName: 'Regata Seda Básica Areia', price: 51.10, quantity: 1 }
    ],
    total: 750.90,
    paymentMethod: 'Cartão de Crédito',
    status: 'Pago',
    createdAt: '2026-05-18T14:35:00Z',
    notes: 'Embalar para presente.'
  }
];

export const INITIAL_AUTOMATIONS: AutomationRule[] = [
  { id: 'aut_1', triggerEvent: 'Mensagem criada', actionStage: 'Rascunho', active: true, title: 'Mensagem Iniciada', description: 'Ao criar/importar um novo contato, define a etapa do funil como Rascunho.' },
  { id: 'aut_2', triggerEvent: 'Mensagem enviada', actionStage: 'Lead', active: true, title: 'Mensagem Enviada', description: 'Ao enviar um template ou mensagem proativa, move o contato para Lead.' },
  { id: 'aut_3', triggerEvent: 'Cliente respondeu', actionStage: 'Em atendimento', active: true, title: 'Resposta do Cliente', description: 'Quando o lead responder no chat, move-o instantaneamente para Em Atendimento.' },
  { id: 'aut_4', triggerEvent: 'Pedido criado', actionStage: 'Pedido gerado', active: true, title: 'Geração de Pedido', description: 'Ao emitir um pedido no modal do chat, atualiza o funil para Pedido Gerado.' },
  { id: 'aut_5', triggerEvent: 'Pagamento aprovado', actionStage: 'Pago', active: true, title: 'Pagamento Aprovado', description: 'Ao marcar um pedido como Pago, move o lead automaticamente para Pago.' },
  { id: 'aut_6', triggerEvent: 'Marcado como fechado', actionStage: 'Fechado', active: true, title: 'Encerramento de Lead', description: 'Ao declarar "fechado" no chat, atualiza a etapa para Fechado.' }
];

export const INITIAL_PRODUCTS_DIGITAL_MENU: ProductDigitalMenu[] = [
  {
    id: 'p1',
    name: 'Serrano Premium Burger 🍔',
    description: 'Blend artesanal de 180g de angus, queijo brie derretido, rúcula fresca e geleia de pimenta defumada no pão brioche selado na manteiga.',
    category: 'Hambúrgueres',
    price: 34.00,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop',
    tamanhos: [
      { label: 'P (120g)', price: 30.00 },
      { label: 'M (180g)', price: 34.00 },
      { label: 'G (240g de Duplo Blend)', price: 42.00 }
    ],
    adicionais: [
      { id: 'add_1', name: 'Bacon Crocante', price: 5.00 },
      { id: 'add_2', name: 'Queijo Prato Extra', price: 4.00 },
      { id: 'add_3', name: 'Ovo na Chapa', price: 3.00 },
      { id: 'add_4', name: 'Molho Especial Green', price: 2.00 }
    ],
    naoMandar: [
      'Retirar Rúcula',
      'Retirar Geleia de Pimenta',
      'Retirar Queijo'
    ],
    utensilios: [
      { id: 'ut_1', name: 'Talher Descartável', price: 1.00 },
      { id: 'ut_2', name: 'Guardanapo Extra', price: 0.00 },
      { id: 'ut_3', name: 'Copo de Plástico Rígido', price: 1.50 }
    ]
  },
  {
    id: 'p2',
    name: 'Pizza Rústica Trufada 🍕',
    description: 'Molho de tomate pelado italiano, mozzarella artesanal fior di latte, cogumelos salteados franceses e um fio de azeite trufado branco.',
    category: 'Pizzas',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop',
    tamanhos: [
      { label: 'Individual (4 Fatias)', price: 45.00 },
      { label: 'Média (6 Fatias)', price: 60.00 },
      { label: 'Família (8 Fatias)', price: 80.00 }
    ],
    adicionais: [
      { id: 'add_5', name: 'Borda Recheada Catupiry', price: 10.00 },
      { id: 'add_6', name: 'Mozzarella Extra', price: 6.00 },
      { id: 'add_7', name: 'Cogumelos Extra', price: 8.00 }
    ],
    naoMandar: [
      'Sem Cogumelos',
      'Sem Manjericão',
      'Cebola'
    ],
    utensilios: [
      { id: 'ut_4', name: 'Prato Descartável', price: 0.80 },
      { id: 'ut_2', name: 'Guardanapo Extra', price: 0.00 }
    ]
  },
  {
    id: 'p3',
    name: 'Açaí Bowl Premium 🍧',
    description: 'Açaí orgânico batido puríssimo da Amazônia, servido gelado com granola super crocante, fitas de coco e raspas de chocolate belga.',
    category: 'Doces & Sobremesas',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop',
    tamanhos: [
      { label: 'Copão 300ml', price: 18.00 },
      { label: 'Tigela 500ml', price: 25.00 },
      { label: 'Combustível 700ml', price: 32.00 }
    ],
    adicionais: [
      { id: 'add_8', name: 'Leite Ninho em Pó', price: 3.50 },
      { id: 'add_9', name: 'Nutella Creme Original', price: 6.00 },
      { id: 'add_10', name: 'Paçoca Moída', price: 2.00 }
    ],
    naoMandar: [
      'Sem Granola',
      'Sem Mel'
    ],
    utensilios: [
      { id: 'ut_5', name: 'Colher de Plástico', price: 0.50 },
      { id: 'ut_2', name: 'Guardanapo Extra', price: 0.00 }
    ]
  }
];

export const INITIAL_CARDAPIOS: Cardapio[] = [
  {
    id: 'm1',
    name: 'Cardápio Inverno Gourmet ❄️',
    description: 'Pratos quentes e lanches artesanais premium selecionados para elevar as suas noites de inverno frias.',
    imageBanner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop',
    availableHours: '18:00h às 23:30h',
    active: true,
    productIds: ['p1', 'p2', 'p3'],
    createdAt: '2026-05-20T10:00:00Z'
  },
  {
    id: 'm2',
    name: 'Promoções de Almoço Executivo ☀️',
    description: 'Menu pocket com preços convidativos para otimizar o seu dia.',
    imageBanner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
    availableHours: '11:00h às 14:30h',
    active: false,
    productIds: ['p1', 'p3'],
    createdAt: '2026-05-25T08:00:00Z'
  }
];

export const INITIAL_DELIVERY_ORDERS: DeliveryOrder[] = [
  {
    id: 'DEL-8191',
    clientId: '1',
    clientName: 'Ana Silva Mendonça',
    clientPhone: '(11) 98765-4321',
    items: [
      {
        productId: 'p1',
        productName: 'Serrano Premium Burger 🍔',
        selectedSize: 'M (180g)',
        selectedSizePrice: 34.00,
        selectedAddons: [
          { id: 'add_1', name: 'Bacon Crocante', price: 5.00 }
        ],
        removedItems: ['Retirar Rúcula'],
        selectedUtensils: [
          { id: 'ut_2', name: 'Guardanapo Extra', price: 0.00 }
        ],
        quantity: 1,
        observation: 'Ponto bem passado, por favor!',
        subtotal: 39.00
      }
    ],
    subtotal: 39.00,
    deliveryFee: 7.00,
    total: 46.00,
    paymentMethod: 'Pix',
    status: 'PEDIDO GERADO',
    createdAt: '2026-05-27T01:10:00Z',
    deliveryTime: '20:30',
    address: {
      name: 'Ana Silva Mendonça',
      phone: '(11) 98765-4321',
      street: 'Alameda Lorena',
      number: '1420',
      neighborhood: 'Cerqueira César',
      complement: 'Apt 52',
      zipCode: '01424-001',
      email: 'ana.silva@outlook.com'
    }
  }
];


export const DEFAULT_SETTINGS: AppSettings = {
  restaurant: {
    name: 'Restaurante Prato Mineiro',
    brandName: 'Restaurante Prato Mineiro',
    systemName: 'LidacomZapCRM Inteligente',
    legalName: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
    social: {
      instagram: '',
      website: '',
    },
  },
  operation: {
    isOpen: true,
    timezone: 'America/Sao_Paulo',
    averagePreparationMinutes: 25,
    acceptPublicOrders: true,
    acceptTableOrders: true,
  },
  delivery: {
    defaultFee: 7,
    freeDeliveryAbove: null,
    defaultEtaMinutes: 12,
    maxDelayAlertMinutes: 15,
    maxRadiusKm: null,
    allowedNeighborhoods: [],
  },
  cashier: {
    suggestedInitialBalance: 100,
    defaultPaymentMethod: 'Dinheiro',
    acceptedPaymentMethods: ['Pix', 'Cartão', 'Dinheiro'],
    requireDailyClosing: true,
    differenceTolerance: 0,
  },
  whatsapp: {
    sessionStatus: 'connected',
    quickTemplates: [
      'Olá {nome}! Seu pedido foi recebido pelo Restaurante Prato Mineiro.',
      'Seu pedido entrou em produção.',
      'Seu pedido está pronto e aguardando despacho.',
    ],
    statusMessages: {
      orderCreated: 'Pedido recebido pelo Restaurante Prato Mineiro.',
      production: 'Seu pedido entrou em produção.',
      ready: 'Seu pedido está pronto e aguardando despacho.',
      outForDelivery: 'Seu pedido saiu para entrega.',
      closed: 'Pedido entregue. Agradecemos a preferência!',
    },
  },
  dispatcher: {
    dailyLimit: 250,
    intervalMin: 4,
    intervalMax: 12,
    autoPause: true,
    autoPauseAfter: 50,
    defaultChannel: 'todos',
    excludeGroups: true,
    excludeBlocked: true,
    excludeAlreadySent: true,
    defaultMessage: 'Olá {cliente}! Tudo bem? O Restaurante Prato Mineiro tem uma oferta especial para você hoje.',
  },
  ui: {
    theme: 'dark',
    operatorName: 'Administrador',
    operatorRole: 'Admin',
  },
  dailyLimit: 250,
  intervalMin: 4,
  intervalMax: 12,
  autoPause: true,
  autoPauseAfter: 50,
  supabaseUrl: 'https://supabase.co/xyz-crm-app',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.mockKeyString',
  waSessionStatus: 'connected',
  operatorRole: 'Admin',
  operatorName: 'Administrador',
  theme: 'dark'
};

import { Courier, DeliveryRoute, CourierReview, DeliveryHistory } from '../types';

export const INITIAL_COURIERS: Courier[] = [
  {
    id: 'moto_1',
    name: 'Danilo Alvarenga',
    phone: '(11) 98765-1122',
    cpf: '123.456.789-00',
    vehicle: 'CG Titan 160cc Preta',
    plate: 'ABC-1234',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
    vehicleType: 'moto',
    status: 'Disponível',
    activeOrders: [],
    rating: 4.9,
    avgDeliveryTime: '20 min',
    lastLocation: { lat: -23.5615, lng: -46.6559, address: 'Av. Paulista, 1000' }
  },
  {
    id: 'moto_2',
    name: 'Carlos Eduardo',
    phone: '(21) 98765-3344',
    cpf: '234.567.890-11',
    vehicle: 'Lander 250cc Azul',
    plate: 'XYZ-5678',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
    vehicleType: 'moto',
    status: 'Em entrega',
    activeOrders: ['DEL-8191'],
    rating: 4.7,
    avgDeliveryTime: '25 min',
    lastLocation: { lat: -23.5652, lng: -46.6508, address: 'Alameda Santos, 1200' }
  },
  {
    id: 'moto_3',
    name: 'Roberta Rodrigues',
    phone: '(31) 98765-5566',
    cpf: '345.678.901-22',
    vehicle: 'Pop 110i Vermelha',
    plate: 'QWE-9012',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop',
    vehicleType: 'moto',
    status: 'Disponível',
    activeOrders: [],
    rating: 4.8,
    avgDeliveryTime: '18 min',
    lastLocation: { lat: -23.5592, lng: -46.6621, address: 'Rua Augusta, 800' }
  },
  {
    id: 'moto_4',
    name: 'Jefferson Lucas',
    phone: '(11) 98765-7788',
    cpf: '456.789.012-33',
    vehicle: 'NXR Bros 160 Verde',
    plate: 'MNO-3456',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop',
    vehicleType: 'moto',
    status: 'Offline',
    activeOrders: [],
    rating: 4.6,
    avgDeliveryTime: '22 min',
    lastLocation: { lat: -23.5539, lng: -46.6521, address: 'Consolação, 2000' }
  }
];

export const INITIAL_ROUTES: DeliveryRoute[] = [
  {
    id: 'R-8191',
    orderId: 'DEL-8191',
    courierId: 'moto_2',
    status: 'Em Rota',
    originLat: -23.5615,
    originLng: -46.6559,
    destLat: -23.5702,
    destLng: -46.6441,
    currentLat: -23.5671,
    currentLng: -46.6482,
    remainingTime: '8 min',
    remainingDistance: '1.2 km',
    speedKmh: 42,
    historyCoords: [
      { lat: -23.5615, lng: -46.6559 },
      { lat: -23.5641, lng: -46.6520 }
    ],
    alerts: [],
    updatedAt: '2026-05-27T03:00:00Z'
  }
];

export const INITIAL_COURIER_REVIEWS: CourierReview[] = [
  { id: 'rev_1', courierId: 'moto_1', rating: 5, comment: 'Muito rápido e prestativo!', date: '2026-05-26' },
  { id: 'rev_2', courierId: 'moto_2', rating: 4, comment: 'Comida chegou quentinha, parabéns.', date: '2026-05-26' },
  { id: 'rev_3', courierId: 'moto_3', rating: 5, comment: 'Super simpática e entregou antes do tempo.', date: '2026-05-25' }
];

export const INITIAL_DELIVERY_HISTORIES: DeliveryHistory[] = [
  { id: 'hist_1', orderId: 'DEL-2039', courierId: 'moto_1', courierName: 'Danilo Alvarenga', clientName: 'Guilherme Santos', totalWithFee: 52.80, deliveredAt: '2026-05-26T21:40:00Z', status: 'SUCESSO', avgSpeed: 38 },
  { id: 'hist_2', orderId: 'DEL-4012', courierId: 'moto_3', courierName: 'Roberta Rodrigues', clientName: 'Beatriz Vasques', totalWithFee: 89.00, deliveredAt: '2026-05-26T22:15:00Z', status: 'SUCESSO', avgSpeed: 34 },
  { id: 'hist_3', orderId: 'DEL-1123', courierId: 'moto_2', courierName: 'Carlos Eduardo', clientName: 'Leandro Rocha', totalWithFee: 41.50, deliveredAt: '2026-05-25T19:50:00Z', status: 'ATRASADO', avgSpeed: 28 }
];

// Data Store Helper with LocalStorage integration
export const loadData = <T>(key: string, defaultValue: T): T => {
  try {
    const value = localStorage.getItem(`crm_wa_${key}`);
    if (value) {
      return JSON.parse(value) as T;
    }
  } catch (err) {
    console.error(`Error loading key: ${key}`, err);
  }
  return defaultValue;
};

export const saveData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`crm_wa_${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key: ${key}`, err);
  }
};
