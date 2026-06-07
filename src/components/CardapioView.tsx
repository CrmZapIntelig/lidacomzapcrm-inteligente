/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Send,
  CheckCircle,
  Clock,
  ShoppingCart,
  User,
  MapPin,
  CreditCard,
  DollarSign,
  Printer,
  ChefHat,
  Bike,
  ClipboardCheck,
  ChevronRight,
  Utensils,
  Eye,
  Percent,
  X,
  AlertCircle,
  Info,
  Calendar
} from 'lucide-react';
import { Cardapio, ProductDigitalMenu, DeliveryOrder, DeliveryOrderItem, Client, MenuItemSize, MenuItemAddon, MenuItemUtensil } from '../types';

interface CardapioViewProps {
  clients: Client[];
  onUpdateClient: (updated: Client) => void;
  onAddHistoryEvent: (clientId: string, type: any, title: string, description: string) => void;
  onSendMessage: (clientId: string, text: string, type?: any, fileName?: string) => void;
  cardapios: Cardapio[];
  setCardapios: React.Dispatch<React.SetStateAction<Cardapio[]>>;
  products: ProductDigitalMenu[];
  setProducts: React.Dispatch<React.SetStateAction<ProductDigitalMenu[]>>;
  deliveryOrders: DeliveryOrder[];
  setDeliveryOrders: React.Dispatch<React.SetStateAction<DeliveryOrder[]>>;
}

export default function CardapioView({
  clients,
  onUpdateClient,
  onAddHistoryEvent,
  onSendMessage,
  cardapios,
  setCardapios,
  products,
  setProducts,
  deliveryOrders,
  setDeliveryOrders,
}: CardapioViewProps) {
  // Navigation tabs inside Cardapio
  const [subTab, setSubTab] = useState<'cardapios' | 'produtos' | 'pedidos' | 'simulador' | 'mesas'>('cardapios');

  // Modals visibility
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // --- MENU FORM STATE ---
  const [menuName, setMenuName] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuBanner, setMenuBanner] = useState('');
  const [menuHours, setMenuHours] = useState('18:00h às 23:45h');
  const [menuActive, setMenuActive] = useState(true);
  const [selectedProductIdsForNewMenu, setSelectedProductIdsForNewMenu] = useState<string[]>([]);

  // --- PRODUCT FORM STATE ---
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategory, setProdCategory] = useState('Hambúrgueres');
  const [prodBasePrice, setProdBasePrice] = useState('29.90');
  const [prodImage, setProdImage] = useState('');
  
  // Dynamic arrays inside Product creation
  const [prodTamanhos, setProdTamanhos] = useState<MenuItemSize[]>([
    { label: 'P', price: 25.00 },
    { label: 'M', price: 29.90 },
    { label: 'G', price: 35.00 }
  ]);
  const [newSizeLabel, setNewSizeLabel] = useState('');
  const [newSizePrice, setNewSizePrice] = useState('');

  const [prodAdicionais, setProdAdicionais] = useState<MenuItemAddon[]>([
    { id: 'add_b', name: 'Bacon Extra', price: 5.00 },
    { id: 'add_q', name: 'Queijo Derretido', price: 4.00 }
  ]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');

  const [prodNaoMandar, setProdNaoMandar] = useState<string[]>([
    'Retirar Cebola', 'Retirar Tomate', 'Sem Molho'
  ]);
  const [newNaoMandarItem, setNewNaoMandarItem] = useState('');

  const [prodUtensilios, setProdUtensilios] = useState<MenuItemUtensil[]>([
    { id: 'ut_t', name: 'Garfo e Faca', price: 1.00 },
    { id: 'ut_g', name: 'Guardanapo de Papel', price: 0.00 }
  ]);
  const [newUtensilName, setNewUtensilName] = useState('');
  const [newUtensilPrice, setNewUtensilPrice] = useState('');

  // --- CLIENT EMULATOR SELECTIONS ---
  const [selectedSimMenu, setSelectedSimMenu] = useState<Cardapio | null>(cardapios[0] || null);
  const [activeClientSimProduct, setActiveClientSimProduct] = useState<ProductDigitalMenu | null>(null);

  // Product customized selections inside Simulator
  const [simSize, setSimSize] = useState<MenuItemSize | null>(null);
  const [simSelectedAddons, setSimSelectedAddons] = useState<MenuItemAddon[]>([]);
  const [simRemovedItems, setSimRemovedItems] = useState<string[]>([]);
  const [simSelectedUtensils, setSimSelectedUtensils] = useState<MenuItemUtensil[]>([]);
  const [simQty, setSimQty] = useState(1);
  const [simObs, setSimObs] = useState('');

  // Basket simulation
  const [simBasket, setSimBasket] = useState<DeliveryOrderItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<'browse' | 'basket' | 'address' | 'receipt'>('browse');

  // Customer checkout Form fields
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custStreet, setCustStreet] = useState('');
  const [custNumber, setCustNumber] = useState('');
  const [custNeighborhood, setCustNeighborhood] = useState('');
  const [custComplement, setCustComplement] = useState('');
  const [custZip, setCustZip] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPayment, setCustPayment] = useState<'Pix' | 'Cartão' | 'Dinheiro'>('Pix');
  const [custChange, setChangeFor] = useState('');
  const [custDeliveryTime, setCustDeliveryTime] = useState('20:30');
  const [custMethod, setCustMethod] = useState<'delivery' | 'mesa'>('delivery');
  const [custMesa, setCustMesa] = useState('01');

  // Load repeat customer cache or update auto-fill
  useEffect(() => {
    if (custPhone) {
      const formatted = custPhone.replace(/\D/g, '');
      const cache = localStorage.getItem(`delivery_address_cache_${formatted}`);
      if (cache) {
        try {
          const parsed = JSON.parse(cache);
          setCustName(parsed.name || '');
          setCustStreet(parsed.street || '');
          setCustNumber(parsed.number || '');
          setCustNeighborhood(parsed.neighborhood || '');
          setCustComplement(parsed.complement || '');
          setCustZip(parsed.zipCode || '');
          setCustEmail(parsed.email || '');
          setCustPayment(parsed.paymentMethod || 'Pix');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [custPhone]);

  // Last simulated order review (Receipt overlay)
  const [lastPlacedSimOrder, setLastPlacedSimOrder] = useState<DeliveryOrder | null>(null);

  // Printing Layout Receipt
  const [orderToPrint, setOrderToPrint] = useState<DeliveryOrder | null>(null);

  // Selected Order for Editing
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null);

  // Auto-select simulator menu if it's set
  useEffect(() => {
    if (cardapios.length > 0 && !selectedSimMenu) {
      setSelectedSimMenu(cardapios[0]);
    }
  }, [cardapios, selectedSimMenu]);

  // --- ACTIONS FOR PRODUCTS ---
  const handleAddSizeToArray = () => {
    if (!newSizeLabel.trim() || !newSizePrice) return;
    setProdTamanhos([...prodTamanhos, { label: newSizeLabel.trim(), price: Number(newSizePrice) }]);
    setNewSizeLabel('');
    setNewSizePrice('');
  };

  const handleAddAddonToArray = () => {
    if (!newAddonName.trim() || !newAddonPrice) return;
    setProdAdicionais([...prodAdicionais, { id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, name: newAddonName.trim(), price: Number(newAddonPrice) }]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  const handleAddUtensilToArray = () => {
    if (!newUtensilName.trim() || !newUtensilPrice) return;
    setProdUtensilios([...prodUtensilios, { id: `ut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, name: newUtensilName.trim(), price: Number(newUtensilPrice) }]);
    setNewUtensilName('');
    setNewUtensilPrice('');
  };

  const handleAddNaoMandarToArray = () => {
    if (!newNaoMandarItem.trim()) return;
    setProdNaoMandar([...prodNaoMandar, newNaoMandarItem.trim()]);
    setNewNaoMandarItem('');
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    const newProd: ProductDigitalMenu = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: prodName.trim(),
      description: prodDesc.trim() || 'Descrição básica',
      image: prodImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop',
      category: prodCategory,
      price: Number(prodBasePrice) || 0,
      tamanhos: prodTamanhos.length > 0 ? prodTamanhos : [{ label: 'Único', price: Number(prodBasePrice) || 0 }],
      adicionais: prodAdicionais,
      naoMandar: prodNaoMandar,
      utensilios: prodUtensilios
    };

    setProducts((prev) => [newProd, ...prev]);

    // reset fields
    setProdName('');
    setProdDesc('');
    setProdCategory('Hambúrgueres');
    setProdBasePrice('29.90');
    setProdImage('');
    setProdTamanhos([
      { label: 'P', price: 25.00 },
      { label: 'M', price: 29.90 },
      { label: 'G', price: 35.00 }
    ]);
    setProdAdicionais([
      { id: 'add_b', name: 'Bacon Extra', price: 5.00 },
      { id: 'add_q', name: 'Queijo Derretido', price: 4.00 }
    ]);
    setProdNaoMandar(['Retirar Cebola', 'Retirar Tomate', 'Sem Molho']);
    setProdUtensilios([
      { id: 'ut_t', name: 'Garfo e Faca', price: 1.00 },
      { id: 'ut_g', name: 'Guardanapo de Papel', price: 0.00 }
    ]);
    setShowAddProductModal(false);
  };

  // --- ACTIONS FOR CARDÁPIOS ---
  const handleToggleProductSelectionForNewMenu = (productId: string) => {
    if (selectedProductIdsForNewMenu.includes(productId)) {
      setSelectedProductIdsForNewMenu(selectedProductIdsForNewMenu.filter(id => id !== productId));
    } else {
      setSelectedProductIdsForNewMenu([...selectedProductIdsForNewMenu, productId]);
    }
  };

  const handleCreateCardapioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuName.trim()) return;

    const newMenu: Cardapio = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: menuName.trim(),
      description: menuDesc.trim(),
      imageBanner: menuBanner.trim() || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop',
      availableHours: menuHours,
      active: menuActive,
      productIds: selectedProductIdsForNewMenu,
      createdAt: new Date().toISOString()
    };

    setCardapios((prev) => [newMenu, ...prev]);

    // reset fields
    setMenuName('');
    setMenuDesc('');
    setMenuBanner('');
    setMenuHours('18:00h às 23:45h');
    setMenuActive(true);
    setSelectedProductIdsForNewMenu([]);
    setShowAddMenuModal(false);
  };

  const handleToggleMenuStatus = (menuId: string) => {
    setCardapios((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, active: !m.active } : m))
    );
  };

  const handleDeleteCardapio = (menuId: string) => {
    if (confirm('Deseja excluir este cardápio permanentemente?')) {
      setCardapios((prev) => prev.filter((m) => m.id !== menuId));
    }
  };

  // --- SIMULATOR BASKET ACCUMULATORS ---
  const handleOpenSimProductCustomize = (prod: ProductDigitalMenu) => {
    setActiveClientSimProduct(prod);
    setSimSize(prod.tamanhos[0] || null);
    setSimSelectedAddons([]);
    setSimRemovedItems([]);
    setSimSelectedUtensils([]);
    setSimQty(1);
    setSimObs('');
  };

  const handleToggleSimAddon = (add: MenuItemAddon) => {
    if (simSelectedAddons.find(a => a.id === add.id)) {
      setSimSelectedAddons(simSelectedAddons.filter(a => a.id !== add.id));
    } else {
      setSimSelectedAddons([...simSelectedAddons, add]);
    }
  };

  const handleToggleSimRemovedItem = (itemStr: string) => {
    if (simRemovedItems.includes(itemStr)) {
      setSimRemovedItems(simRemovedItems.filter(i => i !== itemStr));
    } else {
      setSimRemovedItems([...simRemovedItems, itemStr]);
    }
  };

  const handleToggleSimUtensil = (ut: MenuItemUtensil) => {
    if (simSelectedUtensils.find(u => u.id === ut.id)) {
      setSimSelectedUtensils(simSelectedUtensils.filter(u => u.id !== ut.id));
    } else {
      setSimSelectedUtensils([...simSelectedUtensils, ut]);
    }
  };

  const handleInsertItemToSimBasket = () => {
    if (!activeClientSimProduct || !simSize) return;

    // Calculate subtotal of this specific line product
    const addonsTotal = simSelectedAddons.reduce((sum, a) => sum + a.price, 0);
    const utensilsTotal = simSelectedUtensils.reduce((sum, u) => sum + u.price, 0);
    const itemPrice = simSize.price + addonsTotal + utensilsTotal;
    const finalSubtotal = itemPrice * simQty;

    const basketItem: DeliveryOrderItem = {
      productId: activeClientSimProduct.id,
      productName: activeClientSimProduct.name,
      selectedSize: simSize.label,
      selectedSizePrice: simSize.price,
      selectedAddons: simSelectedAddons,
      removedItems: simRemovedItems,
      selectedUtensils: simSelectedUtensils,
      quantity: simQty,
      observation: simObs.trim() || undefined,
      subtotal: finalSubtotal
    };

    setSimBasket([...simBasket, basketItem]);
    setActiveClientSimProduct(null);
  };

  // --- PLACING DELIVERY ORDER SIMULATION ---
  const handleFinalizeSimulatedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (simBasket.length === 0 || !custName.trim() || !custPhone.trim() || !custStreet.trim() || !custNumber.trim() || !custNeighborhood.trim()) {
      alert('Favor preencher todos os dados obrigatórios de entrega.');
      return;
    }

    const subtotal = simBasket.reduce((sum, x) => sum + x.subtotal, 0);
    const deliveryFee = 7.00;
    const total = subtotal + deliveryFee;

    const orderId = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    const deliveryAddress = {
      name: custName.trim(),
      phone: custPhone.trim(),
      street: custStreet.trim(),
      number: custNumber.trim(),
      neighborhood: custNeighborhood.trim(),
      complement: custComplement.trim() || undefined,
      zipCode: custZip.trim(),
      email: custEmail.trim() || undefined,
      changeFor: custChange.trim() || undefined
    };

    // 1. Find matching Client by phone or name to link properly (fallbacks to first available)
    let matchedClient = clients.find(c => c.phone.replace(/\D/g, '') === custPhone.replace(/\D/g, '') || c.name.toLowerCase().includes(custName.toLowerCase()));
    
    if (!matchedClient) {
      // Pick first active client as fallback operator to inject the WhatsApp message simulation
      matchedClient = clients[0];
    }
    
    const newDelOrder: DeliveryOrder = {
      id: orderId,
      clientId: matchedClient.id, // Better linking based on matching client
      clientName: custName.trim(),
      clientPhone: custPhone.trim(),
      items: simBasket,
      subtotal,
      deliveryFee: custMethod === 'mesa' ? 0 : deliveryFee,
      total: custMethod === 'mesa' ? subtotal : total,
      paymentMethod: custPayment,
      status: 'PEDIDO GERADO',
      createdAt: new Date().toISOString(),
      deliveryTime: custMethod === 'mesa' ? 'Agora (Local)' : custDeliveryTime,
      address: deliveryAddress,
      channel: custMethod === 'mesa' ? 'mesa_qr' : (matchedClient.channel === 'ambos' ? 'whatsapp' : matchedClient.channel || 'whatsapp'),
      notes: custMethod === 'mesa' ? `Mesa/Comanda: ${custMesa}` : undefined,
    };

    // Save client details to cache for auto-fill in future
    const phoneDigits = custPhone.replace(/\D/g, '');
    localStorage.setItem(`delivery_address_cache_${phoneDigits}`, JSON.stringify(deliveryAddress));

    // Append to general state list
    setDeliveryOrders((prev) => [newDelOrder, ...prev]);

    if (matchedClient) {
      // Update statistics of CRM client
      const updatedClient: Client = {
        ...matchedClient,
        // Move stage to 'Pedido gerado'
        stage: 'Pedido gerado',
        // Update totals
        totalBought: matchedClient.totalBought + total,
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      };
      onUpdateClient(updatedClient);

      // Create history event
      onAddHistoryEvent(
        matchedClient.id,
        'order_created',
        'Novo Checkout Delivery',
        `Pedido de delivery integrado realizado pelo Cardápio: ${orderId} - Total: R$ ${total.toFixed(2)} - Status: PEDIDO GERADO`
      );

      // 2. BUILD OUT REALISTIC DIGITAL TEXT RECEIPT FOR WHATSAPP INNER SCREEN
      const orderMessage = `🍔 *NOVO PEDIDO DELIVERY (${orderId})* 🍔
------------------------------------
👤 *Cliente:* ${custName}
📞 *Contatos:* ${custPhone}

🛒 *ITENS:*
${simBasket.map(it => `• *${it.quantity}x* ${it.productName} (${it.selectedSize})
  ${it.selectedAddons.length > 0 ? `  + Adicionais: ${it.selectedAddons.map(a => `${a.name}(+R$ ${a.price.toFixed(2)})`).join(', ')}\n` : ''}${it.removedItems.length > 0 ? `  - RETIRAR: ${it.removedItems.join(', ')}\n` : ''}${it.selectedUtensils.length > 0 ? `  + Utensílios: ${it.selectedUtensils.map(u => u.name).join(', ')}\n` : ''}${it.observation ? `  _Obs: "${it.observation}"_\n` : ''}  Subtotal: R$ ${it.subtotal.toFixed(2)}`).join('\n\n')}

------------------------------------
📦 *DADOS DE ENTREGA:*
📍 *Endereço:* ${custStreet}, ${custNumber}
🏙️ *Bairro:* ${custNeighborhood}
${custComplement ? `🏢 *Complemento:* ${custComplement}\n` : ''}📮 *CEP:* ${custZip}
⏱️ *Entrega agendada:* ${custDeliveryTime}

🤝 *DADOS FINANCEIROS:*
💰 *Subtotal:* R$ ${subtotal.toFixed(2)}
🛵 *Taxa de Entrega:* R$ ${deliveryFee.toFixed(2)}
💳 *Total:* *R$ ${total.toFixed(2)}*
💳 *Pagamento:* ${custPayment}${custChange ? ` (Troco para ${custChange})` : ''}
------------------------------------
🏁 _Resumo integrado do GreenHub Delivery_`;

      onSendMessage(matchedClient.id, orderMessage, 'text');
    }

    // SetPlaced
    setLastPlacedSimOrder(newDelOrder);
    setCheckoutStep('receipt');
    setSimBasket([]);
  };

  // --- GESTÃO DELIVERY STATUS TRIGGERS ---
  const handleUpdateDeliveryStatus = (orderId: string, newStatus: DeliveryOrder['status']) => {
    setDeliveryOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    const orderObj = deliveryOrders.find(o => o.id === orderId);
    if (!orderObj) return;

    // Map delivery order state change to CRM funnel update
    let targetCrmStage: Client['stage'] = 'Pedido gerado';
    let label = 'Novo status delivery';

    if (newStatus === 'PRODUÇÃO') {
      targetCrmStage = 'Produção';
      label = 'Status: Em Produção';
    } else if (newStatus === 'EM ENTREGA') {
      targetCrmStage = 'Entregue';
      label = 'Status: Saiu para entrega';
    } else if (newStatus === 'FECHADO') {
      targetCrmStage = 'Fechado';
      label = 'Status: Entregue (Fechado)';
    }

    // Find and update customer
    const phoneDigits = orderObj.clientPhone.replace(/\D/g, '');
    const matchedClient = clients.find(c => c.phone.replace(/\D/g, '') === phoneDigits || c.name.toLowerCase().includes(orderObj.clientName.toLowerCase()));

    if (matchedClient) {
      const updated = { ...matchedClient, stage: targetCrmStage };
      onUpdateClient(updated);
      onAddHistoryEvent(matchedClient.id, 'stage_change', 'Automação Comercial Delivery', `O pedido delivery ${orderId} foi alterado para ${newStatus}. Funil CRM sincronizado para a coluna: ${targetCrmStage}.`);
    }
  };

  const handleDeleteDeliveryOrder = (orderId: string) => {
    if (confirm('Deseja excluir esta ordem de delivery do arquivo de gestão?')) {
      setDeliveryOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  };

  const handleSaveEditedOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setDeliveryOrders(prev => prev.map(o => o.id === editingOrder.id ? editingOrder : o));
    alert('Ordem atualizada com sucesso!');
    setEditingOrder(null);
  };

  return (
    <div className="space-y-6 font-sans p-1 pb-16">
      
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Central de Lançamentos Delivery & Cardápio Digital</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crie cardápios interativos, gerencie pedidos gourmet da cozinha com diagramas e conecte checkouts com clientes do WhatsApp.
          </p>
        </div>

        {/* Inner menu modules */}
        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs font-semibold gap-1 shrink-0">
          <button
            onClick={() => setSubTab('cardapios')}
            className={`px-3 py-2 rounded-lg transition ${
              subTab === 'cardapios'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            1. Meus Cardápios
          </button>
          <button
            onClick={() => setSubTab('produtos')}
            className={`px-3 py-2 rounded-lg transition ${
              subTab === 'produtos'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            2. Produtos Gourmet
          </button>
          <button
            onClick={() => setSubTab('simulador')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
              subTab === 'simulador'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            3. Simulador de Checkout
          </button>
          <button
            onClick={() => setSubTab('pedidos')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
              subTab === 'pedidos'
                ? 'bg-indigo-500 text-white shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            4. Painel de Pedidos Delivery ({deliveryOrders.length})
          </button>
          <button
            onClick={() => setSubTab('mesas')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-1 ${
              subTab === 'mesas'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            5. Mesas QR
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          SUB-TAB 1: GESTÃO DE CARDÁPIOS
         ------------------------------------------------------------- */}
      {subTab === 'cardapios' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-semibold text-slate-705 dark:text-slate-350">
                Cardápios Ativos podem ser compartilhados via link em massa.
              </span>
            </div>
            
            <button
              onClick={() => setShowAddMenuModal(true)}
              className="bg-emerald-500 hover:bg-emerald-605 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cardápio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cardapios.map((menu) => (
              <div
                key={menu.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                {/* Banner */}
                <div className="h-36 relative bg-slate-100">
                  <img
                    src={menu.imageBanner}
                    alt={menu.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[10px] font-bold font-mono tracking-wide text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md max-w-fit mb-1 border border-amber-80 *">
                      {menu.availableHours}
                    </span>
                    <h3 className="font-bold text-white text-base leading-tight">{menu.name}</h3>
                  </div>
                </div>

                <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    "{menu.description}"
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Produtos Inclusos:</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {menu.productIds.length === 0 ? (
                        <span className="text-slate-400 text-[10px] italic">Sem produtos</span>
                      ) : (
                        menu.productIds.map((pId) => {
                          const p = products.find((prod) => prod.id === pId);
                          return p ? (
                            <span
                              key={pId}
                              className="bg-slate-100 dark:bg-slate-805 border border-slate-200/50 dark:border-slate-755 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-lg"
                            >
                              {p.name.split(' ')[0]} {/* shortened badge */}
                            </span>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-xs font-semibold gap-2">
                    <button
                      onClick={() => handleToggleMenuStatus(menu.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                        menu.active
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/50'
                      }`}
                    >
                      {menu.active ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-500" />
                          <span>Menu Ativo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                          <span>Menu Inativo</span>
                        </>
                      )}
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedSimMenu(menu);
                          setSubTab('simulador');
                          setCheckoutStep('browse');
                        }}
                        className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-850 py-1.5 px-2.5 rounded-lg hover:bg-indigo-100 transition inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Cardápio</span>
                      </button>

                      <button
                        onClick={() => {
                          const text = `Olá, dê uma olhada no nosso menu digital *${menu.name}*! Acesse e faça o pedido direto no chat: ${window.location.origin}/cardapio/${menu.id}`;
                        
                          if (clients.length > 0) {
                            onSendMessage(clients[0].id, text, 'text');
                            alert(`Link gerado enviado para ${clients[0].name} via WhatsApp!`);
                          } else {
                            alert('Nenhum cliente cadastrado no funil para enviar.');
                          }
                        }}
                        className="bg-emerald-500 text-white font-bold py-1.5 px-2 rounded-lg hover:bg-emerald-600 transition flex items-center justify-center"
                        title="Enviar Link WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCardapio(menu.id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 2: PRODUTOS GOURMET
         ------------------------------------------------------------- */}
      {subTab === 'produtos' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-850 p-4 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Gerencie opções gastronômicas com múltiplos tamanhos, adicionais e utensílios personalizados.
            </span>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-indigo-500/10 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex gap-4 text-xs"
              >
                {/* Image */}
                <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 border dark:border-slate-800">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 space-y-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono tracking-wider bg-slate-100 dark:bg-slate-800 border dark:border-slate-750 px-2 py-0.5 rounded-full text-slate-505 dark:text-slate-400 text-slate-400 uppercase">
                        {prod.category}
                      </span>
                      <h4 className="font-bold text-slate-950 dark:text-white mt-1 text-sm">{prod.name}</h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-500">
                      a partir R$ {prod.price.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    {prod.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50 dark:border-slate-800 text-[10px]">
                    {/* Sizes block */}
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-tight block mb-0.5">Tamanhos:</span>
                      <ul className="space-y-0.5 font-mono text-slate-600 dark:text-slate-350">
                        {prod.tamanhos?.map((t, idx) => (
                          <li key={idx} className="flex justify-between max-w-[130px]">
                            <span>{t.label}</span>
                            <span className="font-semibold text-emerald-500">R$ {t.price.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Extras block */}
                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-tight block mb-0.5">Adicionais (+):</span>
                      <ul className="space-y-0.5 font-mono text-slate-600 dark:text-slate-350 truncate">
                        {prod.adicionais?.slice(0, 3).map((a, idx) => (
                          <li key={idx} className="flex justify-between max-w-[130px]">
                            <span className="truncate">{a.name}</span>
                            <span className="text-indigo-400 font-semibold">+R$ {a.price.toFixed(2)}</span>
                          </li>
                        ))}
                        {prod.adicionais?.length > 3 && (
                          <li className="text-[9px] text-slate-400 italic">+{prod.adicionais.length - 3} itens</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Anti-delivery block "Não Mandar" & Utensils */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] border-t border-dashed border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="font-bold text-red-500 uppercase tracking-tight block mb-0.5">"NÃO MANDAR" (Opções):</span>
                      <div className="flex flex-wrap gap-1">
                        {prod.naoMandar?.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 px-1.5 py-0.5 rounded text-[9px] border border-red-200/50">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase tracking-tight block mb-0.5">Utensílios:</span>
                      <div className="flex flex-wrap gap-1">
                        {prod.utensilios?.slice(0, 2).map((u, idx) => (
                          <span key={idx} className="bg-slate-50 dark:bg-slate-805 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px]">
                            {u.name} (+R${u.price})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 3: INTERACTIVE CUSTOMER SIMULATOR
         ------------------------------------------------------------- */}
      {subTab === 'simulador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sticky top-0 items-start">
          
          {/* Menu Selector / Sandbox Control Panel */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Smartphone className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                <span>Simulador de Cliente do WhatsApp</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Opere a interface móvel responsiva emulada abaixo. Preencha o carrinho e finalize para ver o pedido ser injetado nas colunas do CRM e enviar uma notificação de Pix no WhatsApp.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-slate-450 font-bold mb-1 uppercase text-[9px] tracking-wider">Ativar Cardápio Temático:</label>
                <select
                  value={selectedSimMenu?.id || ''}
                  onChange={(e) => {
                    const found = cardapios.find(m => m.id === e.target.value);
                    if (found) setSelectedSimMenu(found);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-850 p-2.5 border border-slate-200 dark:border-slate-705 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  {cardapios.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} {m.active ? '(Ativo)' : '(Rascunho)'}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl leading-relaxed">
                🚀 <strong>Suporte Automatizado:</strong> Ao digitar o telefone de um cliente já atendido, o sistema realiza um <em>"Preenchimento Automático"</em> instantâneo dos campos históricos de endereço para acelerar o checkout.
              </div>

              <div className="border-t pt-4 space-y-2">
                <h4 className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Status dos Pedidos Sincronizados:</h4>
                <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                  <span className="flex items-center gap-1.5 text-blue-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Checkout finalizado ➜ PEDIDO GERADO
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    Cozinha aceitou ➜ PRODUÇÃO
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Motoboy retirou ➜ EM ENTREGA
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Cliente consumiu ➜ FECHADO
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Mobile Smartphone Frame Mockup */}
          <div className="lg:col-span-8 flex justify-center">
            <div className="w-full max-w-[410px] bg-slate-950 rounded-[48px] p-3.5 shadow-2xl relative border-[6px] border-slate-800 aspect-[9/18.5] flex flex-col overflow-hidden text-xs">
              
              {/* iPhone Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute left-3" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse absolute right-4" />
              </div>

              {/* Core Screen Context inside smartphone */}
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-[36px] overflow-hidden flex flex-col relative pt-5 text-slate-800 dark:text-slate-100 font-sans select-none shadow-inner">
                
                {/* Browser top navbar emulating a real web app */}
                <div className="bg-white dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800 p-3 pt-4 flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-slate-400 font-mono tracking-wider">🔒 delivery.greenhub.crm</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setCheckoutStep('browse'); setSimBasket([]); }}
                      className="text-slate-500 text-[10px] bg-slate-100 dark:bg-slate-800/80 p-1 px-2.5 rounded-lg border dark:border-slate-700/50"
                    >
                      Reiniciar
                    </button>
                    {simBasket.length > 0 && checkoutStep === 'browse' && (
                      <button
                        onClick={() => setCheckoutStep('basket')}
                        className="bg-emerald-500 text-white p-1 px-2 rounded-lg flex items-center gap-1 text-[10px] font-bold"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>({simBasket.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* --- PHONE CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none pb-14 text-xs">
                  
                  {/* STEP A: BROWSE DIGITAL MENU */}
                  {checkoutStep === 'browse' && selectedSimMenu && (
                    <div className="space-y-4">
                      {/* Menu Info Banner within screen */}
                      <div className="rounded-2xl overflow-hidden relative h-28 bg-slate-800 shadow-sm">
                        <img
                          src={selectedSimMenu.imageBanner}
                          className="w-full h-full object-cover opacity-85"
                          alt="Banner"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-3 flex flex-col justify-end">
                          <h4 className="font-bold text-white text-sm tracking-tight">{selectedSimMenu.name}</h4>
                          <span className="text-[9px] text-amber-300 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" /> Entrega hoje: {selectedSimMenu.availableHours}
                          </span>
                        </div>
                      </div>

                      {/* Header description */}
                      <p className="text-[10px] text-slate-500 leading-snug italic px-1">
                        "{selectedSimMenu.description}"
                      </p>

                      {/* Menu Product Listing Items */}
                      <div className="space-y-3">
                        <h5 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider border-b pb-1 dark:border-slate-820">Opções Disponíveis:</h5>
                        
                        {selectedSimMenu.productIds.map(pId => {
                          const prod = products.find(p => p.id === pId);
                          if (!prod) return null;

                          return (
                            <div
                              key={pId}
                              onClick={() => handleOpenSimProductCustomize(prod)}
                              className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-2.5 items-center cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500/60 active:scale-[0.98] transition"
                            >
                              <img
                                src={prod.image}
                                className="w-14 h-14 rounded-lg object-cover bg-slate-100 shrink-0 border"
                                alt="Prod"
                              />
                              <div className="flex-1 min-w-0">
                                <h6 className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{prod.name}</h6>
                                <p className="text-[9px] text-slate-450 text-slate-500 line-clamp-1 mt-0.5">{prod.description}</p>
                                <span className="text-[10px] font-mono font-bold text-emerald-500 mt-1 block">R$ {prod.price.toFixed(2)}</span>
                              </div>
                              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                                +
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* STEP B: BASKET SUMMARY */}
                  {checkoutStep === 'basket' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-sm font-bold border-b pb-2">
                        <ChevronRight className="w-4 h-4 cursor-pointer" onClick={() => setCheckoutStep('browse')} />
                        <span>Carrinho de Compras</span>
                      </div>

                      <div className="space-y-2.5">
                        {simBasket.map((it, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-201 dark:border-slate-800 space-y-1.5">
                            <div className="flex justify-between font-bold text-[11px]">
                              <span className="text-slate-900 dark:text-white">{it.quantity}x {it.productName}</span>
                              <span className="font-mono text-emerald-500">R$ {it.subtotal.toFixed(2)}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 italic leading-none">Tamanho: {it.selectedSize}</p>
                            
                            {it.selectedAddons.length > 0 && (
                              <p className="text-[9px] text-slate-450 leading-relaxed">
                                + Extras: {it.selectedAddons.map(a => `${a.name} (+R$ ${a.price})`).join(', ')}
                              </p>
                            )}

                            {it.removedItems.length > 0 && (
                              <p className="text-[9px] text-rose-500 leading-relaxed font-semibold">
                                - Retirar: {it.removedItems.join(', ')}
                              </p>
                            )}

                            {it.selectedUtensils.length > 0 && (
                              <p className="text-[9px] text-slate-400">
                                + Utensílios: {it.selectedUtensils.map(u => `${u.name}`).join(', ')}
                              </p>
                            )}

                            {it.observation && (
                              <p className="text-[9px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded">
                                "Obs: {it.observation}"
                              </p>
                            )}

                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => setSimBasket(simBasket.filter((_, i) => i !== idx))}
                                className="text-[10px] text-rose-500 font-bold hover:underline"
                              >
                                Remover Item
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Display subtotal totals block */}
                      <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border space-y-2 font-mono text-[11px]">
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal:</span>
                          <span>R$ {simBasket.reduce((sum, x) => sum + x.subtotal, 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Entrega Delivery:</span>
                          <span>R$ 7.00</span>
                        </div>
                        <div className="flex justify-between font-bold text-xs text-slate-900 dark:text-white pt-1.5 border-t">
                          <span>TOTAL PEDIDO:</span>
                          <span className="text-emerald-500">R$ {(simBasket.reduce((sum, x) => sum + x.subtotal, 0) + 7.00).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => setCustMethod('delivery')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              custMethod === 'delivery'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-500'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            Entregar (Delivery)
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustMethod('mesa')}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                              custMethod === 'mesa'
                                ? 'bg-amber-50 text-amber-600 border-amber-500'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                            }`}
                          >
                            Consumo na Mesa
                          </button>
                        </div>
                        <button
                          onClick={() => setCheckoutStep('address')}
                          className="w-full bg-emerald-500 font-bold hover:bg-emerald-600 text-white py-3 rounded-xl shadow-xs transition"
                        >
                          Ir para o Checkout ➜
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP C: CLIENT DELIVERY ADDRESS & PAYMENT INFO */}
                  {checkoutStep === 'address' && (
                    <form onSubmit={handleFinalizeSimulatedOrder} className="space-y-3.5">
                      <div className="flex items-center gap-1 text-sm font-bold border-b pb-2">
                        <ChevronRight className="w-4 h-4 cursor-pointer" onClick={() => setCheckoutStep('basket')} />
                        <span>{custMethod === 'delivery' ? 'Insira Dados de Entrega' : 'Dados do Atendimento Local'}</span>
                      </div>

                      <div className="space-y-2.5 text-[10px]">
                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">WhatsApp / Celular (Obrigatório)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: (11) 98765-4321"
                            value={custPhone}
                            onChange={(e) => setCustPhone(e.target.value)}
                            className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nome Completo</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Clara Albuquerque Santos"
                            value={custName}
                            onChange={(e) => setCustName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none"
                          />
                        </div>

                        {custMethod === 'delivery' ? (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="col-span-2">
                                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Endereço / Logradouro</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Rua, Avenida, Alameda..."
                                  value={custStreet}
                                  onChange={(e) => setCustStreet(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Número</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="123"
                                  value={custNumber}
                                  onChange={(e) => setCustNumber(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-center"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Bairro</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Bairro"
                                  value={custNeighborhood}
                                  onChange={(e) => setCustNeighborhood(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Complemento</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Bloco B Apt 2"
                                  value={custComplement}
                                  onChange={(e) => setCustComplement(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Número da Mesa / Identificador</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: 01, 02, Balcão 1"
                              value={custMesa}
                              onChange={(e) => setCustMesa(e.target.value)}
                              className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-2 rounded-lg font-bold text-amber-700 dark:text-amber-400 text-center text-lg"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">CEP</label>
                            <input
                              type="text"
                              required
                              placeholder="01424-001"
                              value={custZip}
                              onChange={(e) => setCustZip(e.target.value)}
                              className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email (Opcional)</label>
                            <input
                              type="email"
                              placeholder="cliente@email.com"
                              value={custEmail}
                              onChange={(e) => setCustEmail(e.target.value)}
                              className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Agendamento ou Hora de entrega</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Entregar às 20:30h ou Imediata"
                            value={custDeliveryTime}
                            onChange={(e) => setCustDeliveryTime(e.target.value)}
                            className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg focus:outline-none"
                          />
                        </div>

                        <div className="border-t pt-2.5 grid grid-cols-3 gap-1 grid bg-slate-100 dark:bg-slate-950 p-2 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setCustPayment('Pix')}
                            className={`p-2 py-2 rounded-lg font-bold flex flex-col items-center justify-center border transition ${
                              custPayment === 'Pix'
                                ? 'bg-emerald-500 text-white border-transparent'
                                : 'bg-white dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <DollarSign className="w-4 h-4 mb-0.5" />
                            <span>PIX</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustPayment('Cartão')}
                            className={`p-2 py-1 rounded-lg font-bold flex flex-col items-center justify-center border transition ${
                              custPayment === 'Cartão'
                                ? 'bg-emerald-500 text-white border-transparent'
                                : 'bg-white dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 mb-0.5" />
                            <span>Cartão</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustPayment('Dinheiro')}
                            className={`p-2 py-1 rounded-lg font-bold flex flex-col items-center justify-center border transition ${
                              custPayment === 'Dinheiro'
                                ? 'bg-emerald-500 text-white border-transparent'
                                : 'bg-white dark:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <User className="w-4 h-4 mb-0.5" />
                            <span>Dinheiro</span>
                          </button>
                        </div>

                        {custPayment === 'Dinheiro' && (
                          <div>
                            <label className="block text-slate-400 font-bold uppercase tracking-wider mb-0.5">Troco para quanto?</label>
                            <input
                              type="text"
                              value={custChange}
                              onChange={(e) => setChangeFor(e.target.value)}
                              placeholder="Ex: Troco para R$ 100,00"
                              className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-2 rounded-lg font-mono text-xs"
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full bg-emerald-500 font-bold hover:bg-emerald-600 text-white py-3 rounded-xl shadow-md transition"
                        >
                          Concluir Ordem Financeira 🚀
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP D: ORDER SUCCESS COMPLETED */}
                  {checkoutStep === 'receipt' && lastPlacedSimOrder && (
                    <div className="text-center space-y-4 pt-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto text-xl">
                        ✓
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Pedido Recebido com Sucesso!</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Dados transferidos para o Painel Gourmet do Operador.</p>
                      </div>

                      <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border font-mono text-left space-y-1 text-[10px]">
                        <p className="text-slate-900 dark:text-white font-bold text-[11px] mb-1.5 text-center">COMPROVANTE LOCAL</p>
                        <p><strong>Nº Ordem:</strong> {lastPlacedSimOrder.id}</p>
                        <p><strong>Cliente:</strong> {lastPlacedSimOrder.clientName}</p>
                        <p><strong>Total Pago:</strong> R$ {lastPlacedSimOrder.total.toFixed(2)}</p>
                        <p><strong>Pagamento:</strong> {lastPlacedSimOrder.paymentMethod}</p>
                        <p className="text-amber-500 font-semibold text-center text-[9px] pt-1.5 leading-tight">🕒 Notificação emitida no chat WhatsApp do cliente.</p>
                      </div>

                      <button
                        onClick={() => {
                          setCheckoutStep('browse');
                          setSimBasket([]);
                          setLastPlacedSimOrder(null);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl w-full text-xs"
                      >
                        Fazer nova compra (Cardápio)
                      </button>
                    </div>
                  )}

                </div>

                {/* Simulated Customizing Overlay Modal inside Smartphone Screen */}
                {activeClientSimProduct && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-3xs z-20 flex flex-col justify-end">
                    <div className="bg-white dark:bg-slate-900 border-t border-slate-250 dark:border-slate-800 rounded-t-[28px] max-h-[85%] overflow-y-auto p-4 space-y-4 scrollbar-none shadow-2xl animate-in slide-in-from-bottom duration-150">
                      
                      {/* Top Header to close */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Customização</span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{activeClientSimProduct.name}</h4>
                        </div>
                        <button
                          onClick={() => setActiveClientSimProduct(null)}
                          className="bg-slate-100 dark:bg-slate-800 text-slate-500 p-1 rounded-full hover:text-slate-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Product descriptive */}
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed pt-1 border-t dark:border-slate-800">
                        {activeClientSimProduct.description}
                      </p>

                      {/* MÚLTIPLOS TAMANHOS */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Escolha o Tamanho:</span>
                        <div className="space-y-1 pb-1">
                          {activeClientSimProduct.tamanhos?.map((sz, i) => (
                            <label
                              key={i}
                              className={`flex items-center justify-between p-2 rounded-xl border text-[10.5px] cursor-pointer transition ${
                                simSize?.label === sz.label
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="simProductSize"
                                  checked={simSize?.label === sz.label}
                                  onChange={() => setSimSize(sz)}
                                  className="accent-emerald-500"
                                />
                                <span>{sz.label}</span>
                              </div>
                              <span className="font-mono text-emerald-500">R$ {sz.price.toFixed(2)}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* ADICIONAIS OPCIONAIS */}
                      {activeClientSimProduct.adicionais && activeClientSimProduct.adicionais.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Deseja adicionar extras? (+)</span>
                          <div className="space-y-1">
                            {activeClientSimProduct.adicionais.map((add) => {
                              const isChecked = !!simSelectedAddons.find(a => a.id === add.id);
                              return (
                                <label
                                  key={add.id}
                                  className={`flex items-center justify-between p-2 rounded-xl text-[10.5px] border cursor-pointer ${
                                    isChecked
                                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                                      : 'border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSimAddon(add)}
                                      className="accent-indigo-500 rounded"
                                    />
                                    <span>{add.name}</span>
                                  </div>
                                  <span className="font-mono font-semibold">+R$ {add.price.toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* NÃO MANDAR BLOCK */}
                      {activeClientSimProduct.naoMandar && activeClientSimProduct.naoMandar.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider block">"NÃO MANDAR" (Marcar para Excluir):</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {activeClientSimProduct.naoMandar.map((ex, idx) => {
                              const isChecked = simRemovedItems.includes(ex);
                              return (
                                <label
                                  key={idx}
                                  className={`flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl text-[9.5px] border cursor-pointer border-rose-200/50 ${
                                    isChecked
                                      ? 'bg-rose-100/50 dark:bg-rose-950/20 text-rose-500 border-rose-450 font-semibold'
                                      : 'bg-slate-50 dark:bg-slate-805 text-slate-500'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleSimRemovedItem(ex)}
                                    className="accent-rose-500 rounded"
                                  />
                                  <span>{ex}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* UTENSÍLIOS DESCARTÁVEIS */}
                      {activeClientSimProduct.utensilios && activeClientSimProduct.utensilios.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Utensílios Descartáveis:</span>
                          <div className="space-y-1">
                            {activeClientSimProduct.utensilios.map((ut) => {
                              const isChecked = !!simSelectedUtensils.find(u => u.id === ut.id);
                              return (
                                <label
                                  key={ut.id}
                                  className={`flex items-center justify-between p-2 rounded-xl text-[10px] border cursor-pointer ${
                                    isChecked
                                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleSimUtensil(ut)}
                                      className="accent-emerald-500 rounded"
                                    />
                                    <span>{ut.name}</span>
                                  </div>
                                  <span className="font-mono">+R$ {ut.price.toFixed(2)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* OBS / QUANTITY CONTROLS */}
                      <div className="pt-2 border-t dark:border-slate-800 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">Quantidade:</span>
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border">
                            <button
                              type="button"
                              onClick={() => setSimQty(Math.max(1, simQty - 1))}
                              className="w-7 h-7 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 border-none font-bold text-sm flex items-center justify-center text-slate-700"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold font-mono text-slate-900 dark:text-white">{simQty}</span>
                            <button
                              type="button"
                              onClick={() => setSimQty(simQty + 1)}
                              className="w-7 h-7 rounded bg-white dark:bg-slate-700 hover:bg-slate-200 border-none font-bold text-sm flex items-center justify-center text-slate-700"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1">Deseja retirar ingredientes? Obs:</label>
                          <textarea
                            value={simObs}
                            onChange={(e) => setSimObs(e.target.value)}
                            rows={2}
                            placeholder="Ex: sem talher, retirar gergelim, ketchup extra..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-[11px] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* INSERT SUBMIT BUTTON */}
                      <button
                        onClick={handleInsertItemToSimBasket}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-xs font-bold"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>INSERIR AO CARRINHO</span>
                      </button>

                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 4: GESTÃO DE PEDIDOS DELIVERY & COZINHA DIAGRAMS
         ------------------------------------------------------------- */}
      {subTab === 'pedidos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
                <ChefHat className="w-5 h-5 text-indigo-505 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950 dark:text-white">Esteira de Produção / Delivery</h3>
                <p className="text-slate-450 text-slate-400 tracking-tight leading-relaxed">
                  Gerencie todo o fluxo de compras de delivery. As ordens são criadas integradas com o sistema de mensagens.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] font-bold">
              <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-500 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                PENDENTE
              </span>
              <span className="bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                EM PRODUÇÃO
              </span>
              <span className="bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-250 border-amber-500/20">
                EM ENTREGA
              </span>
              <span className="bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                ENTREGUE / FECHADO
              </span>
            </div>
          </div>

          {/* Table display list of orders */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-805 border-b border-light-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Código / Registro</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Itens Pedidos</th>
                    <th className="py-3 px-4">Hora Entrega</th>
                    <th className="py-3 px-4">Forma Pgto</th>
                    <th className="py-3 px-4">Valor Total</th>
                    <th className="py-3 px-4">Status Atual</th>
                    <th className="py-3 px-4 text-right">Controles da Cozinha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {deliveryOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                        Nenhuma ordem de delivery registrada. Use o "Simulador de Checkout" para rodar testes.
                      </td>
                    </tr>
                  ) : (
                    deliveryOrders.map((ord) => {
                      const finalTotal = ord.total;
                      
                      return (
                        <tr key={ord.id}>
                          {/* Code */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{ord.id}</span>
                            <span className="text-[10px] text-slate-400 block font-mono bg-slate-50 dark:bg-slate-805 p-0.5 rounded-sm flex max-w-fit mt-1">
                              {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-150 block">{ord.clientName}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">{ord.clientPhone}</span>
                            <span className="text-[9px] text-indigo-400 max-w-[150px] truncate block italic">
                              📍 {ord.address.street}, {ord.address.number} ({ord.address.neighborhood})
                            </span>
                          </td>

                          {/* Items and selections */}
                          <td className="py-3 px-4 space-y-1">
                            {ord.items.map((item, id) => (
                              <div key={id} className="text-[11px] leading-tight">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {item.quantity}un. × {item.productName} ({item.selectedSize})
                                </span>
                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                  <span className="text-[9px] text-slate-400 block leading-none">
                                    + {item.selectedAddons.map(a => a.name).join(', ')}
                                  </span>
                                )}
                                {item.removedItems && item.removedItems.length > 0 && (
                                  <span className="text-[9px] text-rose-500 block font-semibold leading-none">
                                    - RETIRAR: {item.removedItems.join(', ')}
                                  </span>
                                )}
                                {item.selectedUtensils && item.selectedUtensils.length > 0 && (
                                  <span className="text-[9px] text-teal-500 block leading-none">
                                    + Utensílios: {item.selectedUtensils.map(u => u.name).join(', ')}
                                  </span>
                                )}
                                {item.observation && (
                                  <span className="text-[9px] italic text-amber-500 block leading-none pt-0.5">
                                    "Obs: {item.observation}"
                                  </span>
                                )}
                              </div>
                            ))}
                          </td>

                          {/* Time */}
                          <td className="py-3 px-4 font-mono text-xs">{ord.deliveryTime}</td>

                          {/* Payment */}
                          <td className="py-3 px-4 font-mono">
                            <span className="font-semibold text-slate-500">{ord.paymentMethod}</span>
                            {ord.address.changeFor && (
                              <span className="text-[9px] text-amber-600 block">Troco: R$ {ord.address.changeFor}</span>
                            )}
                          </td>

                          {/* Total */}
                          <td className="py-3 px-4 font-mono font-bold text-emerald-500">R$ {finalTotal.toFixed(2)}</td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {ord.status === 'PEDIDO GERADO' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-105 bg-blue-50 dark:bg-blue-950/20 text-blue-500 border border-blue-200">
                                GERAL/PENDENTE
                              </span>
                            ) : ord.status === 'PRODUÇÃO' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-200 animate-pulse">
                                COZINHA/PRODUÇÃO
                              </span>
                            ) : ord.status === 'EM ENTREGA' ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200">
                                EM ROTA ENTREGA
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200">
                                ENTREGUE/CONCLUÍDO
                              </span>
                            )}
                          </td>

                          {/* Controls buttons */}
                          <td className="py-3 px-4 text-right space-y-1.5 shrink-0">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {ord.status === 'PEDIDO GERADO' && (
                                <button
                                  onClick={() => handleUpdateDeliveryStatus(ord.id, 'PRODUÇÃO')}
                                  className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition"
                                >
                                  Aceitar & Cozinhar
                                </button>
                              )}

                              {ord.status === 'PRODUÇÃO' && (
                                <button
                                  onClick={() => handleUpdateDeliveryStatus(ord.id, 'EM ENTREGA')}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition flex items-center gap-0.5"
                                >
                                  <Bike className="w-3 h-3" />
                                  <span>Despachar Moto</span>
                                </button>
                              )}

                              {ord.status === 'EM ENTREGA' && (
                                <button
                                  onClick={() => handleUpdateDeliveryStatus(ord.id, 'FECHADO')}
                                  className="bg-emerald-500 hover:bg-emerald-650 text-white font-bold py-1 px-2.5 rounded-lg text-[10px] transition"
                                >
                                  Marcar Entregue
                                </button>
                              )}

                              <button
                                onClick={() => setOrderToPrint(ord)}
                                className="bg-slate-50 border border-slate-150 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-350 p-1.5 rounded-lg text-[10px]"
                                title="Imprimir Via Cozinha (Receipt)"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setEditingOrder(ord)}
                                className="bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 dark:bg-slate-800 text-indigo-500 p-1.5 rounded-lg text-[10px]"
                                title="Editar Ordem"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteDeliveryOrder(ord.id)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                title="Apagar Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SUB-TAB 5: MESAS QR & COMANDAS
         ------------------------------------------------------------- */}
      {subTab === 'mesas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-500" />
                Mesas QR e Consumo Local
              </h3>
              <p className="text-xs text-slate-500">Gerencie comandas digitais e pedidos do balcão/salão usando QR Code.</p>
            </div>
            <button className="bg-slate-900 dark:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-amber-500 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Nova Mesa
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((tableNum) => (
              <div key={tableNum} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-amber-500 transition-colors">
                <div className={`absolute top-0 w-full h-1 ${tableNum === 1 || tableNum === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <h4 className="text-xl font-black text-slate-800 dark:text-white mt-2">#{String(tableNum).padStart(2, '0')}</h4>
                
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-2 ${
                  tableNum === 1 || tableNum === 2 
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                }`}>
                  {tableNum === 1 || tableNum === 2 ? 'Ocupada' : 'Livre'}
                </span>

                <div className="mt-4 flex gap-2 w-full justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600" title="Ver Comanda">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  </button>
                  <button className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600" title="Imprimir QR Code">
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Comanda Aberta View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col">
                  <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                     Comanda: Mesa #01
                  </h4>
                  <span className="text-xs text-slate-500 font-mono mt-1">Cliente: Carlos Silva (11) 98888-7777</span>
                </div>
                <div className="flex gap-2">
                   <button className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1">Adicionar Item</button>
                   <button className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg flex items-center gap-1">Fechar Conta</button>
                </div>
              </div>
              
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                     <th className="py-2 font-medium">Qtd</th>
                     <th className="py-2 font-medium">Produto</th>
                     <th className="py-2 font-medium text-right">Valor un.</th>
                     <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  <tr>
                    <td className="py-3">2x</td>
                    <td className="py-3 font-sans">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block">Drink Gin Tônica</span>
                      <span className="text-[9px] text-slate-400">Em produção</span>
                    </td>
                    <td className="py-3 text-right text-slate-500">R$ 28,00</td>
                    <td className="py-3 text-right font-semibold">R$ 56,00</td>
                  </tr>
                  <tr>
                    <td className="py-3">1x</td>
                    <td className="py-3 font-sans">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block">Hamburguer G</span>
                      <span className="text-[9px] text-amber-500 bg-amber-50 dark:bg-transparent px-1 rounded">Sem Cebola</span>
                    </td>
                    <td className="py-3 text-right text-slate-500">R$ 35,00</td>
                    <td className="py-3 text-right font-semibold">R$ 35,00</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex justify-end gap-6 text-sm">
                 <div className="flex flex-col items-end gap-1">
                   <span className="text-slate-400 text-[10px] uppercase font-bold">Subtotal</span>
                   <span className="font-mono text-slate-600 dark:text-slate-300">R$ 91,00</span>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                   <span className="text-slate-400 text-[10px] uppercase font-bold">Taxa (10%)</span>
                   <span className="font-mono text-slate-600 dark:text-slate-300">R$ 9,10</span>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                   <span className="text-emerald-500 text-[10px] uppercase font-bold">Total Pago</span>
                   <span className="font-mono text-emerald-600 dark:text-emerald-400">R$ 0,00</span>
                 </div>
                 <div className="flex flex-col items-end gap-1 border-l border-slate-200 dark:border-slate-800 pl-6 ml-2">
                   <span className="text-slate-900 dark:text-white text-[11px] uppercase font-bold">Resumo Total</span>
                   <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">R$ 100,10</span>
                 </div>
              </div>
            </div>
            
            {/* Lançamento de Pagamento */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
               <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Receber Valor
               </h4>
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Método</label>
                    <select className="w-full bg-slate-50 dark:bg-slate-800 border p-2 rounded-lg text-xs outline-none">
                      <option>Pix</option>
                      <option>Cartão de Crédito</option>
                      <option>Cartão de Débito</option>
                      <option>Dinheiro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor (R$)</label>
                    <input type="text" defaultValue="100,10" className="w-full font-mono bg-slate-50 dark:bg-slate-800 border p-2 rounded-lg text-xs outline-none font-bold text-emerald-600" />
                  </div>
                  <button className="w-full bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm hover:brightness-110">
                    Lançar Pagamento
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODALS & FLOATING OVERLAYS (DIAL PORTAL LAYOUTS)
         ============================================================= */} 

      {/* MODAL 1: ADD DIGITAL MENU */}
      {showAddMenuModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-150 text-xs">
            <button
              onClick={() => setShowAddMenuModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-450 hover:text-slate-800 dark:text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b mb-4">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Criar Novo Cardápio Gourmet</h3>
            </div>

            <form onSubmit={handleCreateCardapioSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Identificação do Cardápio</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cardápio Dia dos Namorados 🌹, Hambúrgueres de Sexta"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-slate-805 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Descrição Promocional</label>
                <textarea
                  placeholder="Ex: Pratos selecionados preparados por chefs renomados com preços promocionais exclusivos..."
                  value={menuDesc}
                  onChange={(e) => setMenuDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 text-slate-805 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Banner (URL Imagem)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={menuBanner}
                    onChange={(e) => setMenuBanner(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Horário disponível</label>
                  <input
                    type="text"
                    value={menuHours}
                    onChange={(e) => setMenuHours(e.target.value)}
                    placeholder="18:00h às 23:45h"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 rounded-xl p-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Multi-product checklist integration */}
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider">Selecione os Produtos a Inserir:</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-855 rounded-xl border">
                  {products.map((p) => {
                    const isChecked = selectedProductIdsForNewMenu.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-semibold'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProductSelectionForNewMenu(p.id)}
                          className="accent-indigo-500 rounded"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-4 font-semibold border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-4 py-2.5 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl transition"
                >
                  Inserir e Criar Cardápio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD PRODUCT GOURMET */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-120 text-xs flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowAddProductModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-450 hover:text-slate-800 dark:text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 pb-2 border-b mb-4">
              <Plus className="w-5.5 h-5.5 text-indigo-550 text-indigo-500" />
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Cadastrar Novo Produto Gourmet</h3>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px] tracking-wider">Identificação do Prato</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: X-Burger Smash Bacon 🍔"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 p-2 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px] tracking-wider">Categoria do Cardápio</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-705 p-2 rounded-xl text-slate-805 cursor-pointer focus:outline-none"
                  >
                    <option value="Hambúrgueres">Hambúrgueres</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Doces & Sobremesas">Doces & Sobremesas</option>
                    <option value="Porções & Aperitivos">Porções & Aperitivos</option>
                    <option value="Bebidas">Bebidas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px] tracking-wider">Descrição dos Ingredientes / Prato</label>
                <textarea
                  placeholder="Ex: Blend smash premium grelhado de 140g, queijo cheddar inglês derretido e fatias crocantes..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 col">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px] tracking-wider">Mídia Ilustrativa (Foto URL)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase text-[9px] tracking-wider">Preço Base (Fide-padrão)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="29.90"
                    value={prodBasePrice}
                    onChange={(e) => setProdBasePrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 p-2 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* TAMANHOS DYNAMIC CONTAINER */}
              <div className="border border-slate-100 dark:border-slate-805/80 p-3 rounded-2xl bg-slate-50 dark:bg-slate-855/35">
                <span className="font-bold text-slate-400 uppercase tracking-tight block mb-2 text-[9px]">Grelha de Múltiplos Tamanhos:</span>
                <div className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="Nome tamanho (Ex: Grande M, Copo 500ml)"
                    value={newSizeLabel}
                    onChange={(e) => setNewSizeLabel(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor (Ex: 35.00)"
                    value={newSizePrice}
                    onChange={(e) => setNewSizePrice(e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 p-2 rounded-lg font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddSizeToArray}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold p-2 px-3.5 rounded-lg text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {prodTamanhos.map((sz, i) => (
                    <span key={i} className="bg-white dark:bg-slate-800 border p-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 font-mono">
                      <span>{sz.label}: R$ {sz.price.toFixed(2)}</span>
                      <button type="button" onClick={() => setProdTamanhos(prodTamanhos.filter((_, idx) => idx !== i))} className="text-red-500 font-bold font-sans">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* ADICIONAIS OPCIONAIS CONTAINER */}
              <div className="border border-slate-105 dark:border-slate-805/80 p-3 rounded-2xl bg-slate-50 dark:bg-slate-855/35">
                <span className="font-bold text-slate-405 dark:text-slate-400 uppercase tracking-tight block mb-2 text-[9px]">Ingredientes Adicionais Opcionais (+):</span>
                <div className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="Nome adicional (Ex: Bacon, Creme Extras)"
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço (Ex: 5.00)"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 p-2 rounded-lg font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddAddonToArray}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold p-2 px-3.5 rounded-lg text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {prodAdicionais.map((ad, i) => (
                    <span key={i} className="bg-white dark:bg-slate-800 border p-1 px-2.5 rounded-lg inline-flex items-center gap-1.5 font-mono">
                      <span>{ad.name}: +R$ {ad.price.toFixed(2)}</span>
                      <button type="button" onClick={() => setProdAdicionais(prodAdicionais.filter((_, idx) => idx !== i))} className="text-red-500 font-bold font-sans">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* NÃO MANDAR CONTAINER */}
              <div className="border border-slate-105 dark:border-slate-805/85 p-3 rounded-2xl bg-slate-50 dark:bg-slate-855/35">
                <span className="font-bold text-red-500 uppercase tracking-tight block mb-2 text-[9px]">Gatilhos de Exclusão "NÃO MANDAR":</span>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ex: Retirar Cebola, Retirar Pickles, Sem Maionese"
                    value={newNaoMandarItem}
                    onChange={(e) => setNewNaoMandarItem(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddNaoMandarToArray}
                    className="bg-indigo-500 text-white font-bold p-2 px-3.5 rounded-lg text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prodNaoMandar.map((nm, idx) => (
                    <span key={idx} className="bg-red-50 dark:bg-rose-950/20 text-red-650 dark:text-red-400 border border-red-200/50 p-1 px-2 rounded-lg inline-flex items-center gap-1.5 font-mono">
                      <span>{nm}</span>
                      <button type="button" onClick={() => setProdNaoMandar(prodNaoMandar.filter((_, i) => i !== idx))} className="text-red-650 font-bold font-sans">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* UTENSÍLIOS DESCARTÁVEIS CONTAINER */}
              <div className="border border-slate-105 dark:border-slate-804/80 p-3 rounded-2xl bg-slate-50 dark:bg-slate-855/35">
                <span className="font-bold text-slate-405 dark:text-slate-400 uppercase tracking-tight block mb-2 text-[9px]">Utensílios Descartáveis Personalizados:</span>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Ex: Canudo de Papel, Prato Térmico"
                    value={newUtensilName}
                    onChange={(e) => setNewUtensilName(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 p-2 rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Preço (Ex: 0.80)"
                    value={newUtensilPrice}
                    onChange={(e) => setNewUtensilPrice(e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 p-2 rounded-lg font-mono text-center"
                  />
                  <button
                    type="button"
                    onClick={handleAddUtensilToArray}
                    className="bg-indigo-500 text-white font-bold p-2 px-3.5 rounded-lg text-xs"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prodUtensilios.map((ut, idx) => (
                    <span key={idx} className="bg-white dark:bg-slate-800 border p-1 px-2 rounded-lg inline-flex items-center gap-1.5 font-mono">
                      <span>{ut.name} (+R$ {ut.price})</span>
                      <button type="button" onClick={() => setProdUtensilios(prodUtensilios.filter((_, i) => i !== idx))} className="text-red-500 font-bold font-sans">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs font-semibold pt-4 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="bg-slate-105 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl hover:bg-slate-205 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl transition font-bold shadow-md"
                >
                  Inserir Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TRADITIONAL RECEIPT PAPER (58mm Thermal Printer layout emulation) */}
      {orderToPrint && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-950 border border-slate-300 w-full max-w-[340px] p-5 relative shadow-inner flex flex-col items-center">
            
            {/* Close button top corner */}
            <button
              onClick={() => setOrderToPrint(null)}
              className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-650 text-slate-500 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Simulated 58mm Thermal Receipt styling */}
            <div className="w-full text-[10px] font-mono font-medium leading-relaxed uppercase tracking-tight text-slate-900 space-y-3">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base leading-none tracking-wider">★★★ GREENHUB DELIVERY ★★★</h3>
                <p className="text-[9px] font-bold">CNPJ: 12.345.678/0001-90</p>
                <p className="text-[9px]">SÃO PAULO - SP | SESSÃO ATIVA</p>
                <p className="text-[8px] text-slate-450">FATOR EXCLUSIVO VIA WHATSAPP</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-600 py-1.5 space-y-0.5 text-[9px]">
                <p><strong>Nº Ordem:</strong> {orderToPrint.id}</p>
                <p><strong>Registro:</strong> {new Date(orderToPrint.createdAt).toLocaleDateString('pt-BR')} {new Date(orderToPrint.createdAt).toLocaleTimeString('pt-BR')}</p>
                <p><strong>Operador:</strong> GreenHub AutoSaaS</p>
              </div>

              <div className="space-y-0.5">
                <p className="font-bold text-center border-b pb-1 mb-1 text-[9px] tracking-wide">DETALHAMENTO DE ITENS</p>
                <div className="divide-y divide-slate-205/50 border-b pb-1">
                  {orderToPrint.items.map((it, idx) => (
                    <div key={idx} className="py-1 space-y-0.5">
                      <div className="flex justify-between font-bold text-[9px]">
                        <span>{it.quantity}x {it.productName}</span>
                        <span>R$ {it.subtotal.toFixed(2)}</span>
                      </div>
                      <p className="text-[8px] text-slate-500">Tamanho: {it.selectedSize}</p>
                      
                      {it.selectedAddons && it.selectedAddons.length > 0 && (
                        <p className="text-[8px] text-slate-500 pl-2">
                          + Adicionais: {it.selectedAddons.map(a => a.name).join(', ')}
                        </p>
                      )}

                      {it.removedItems && it.removedItems.length > 0 && (
                        <p className="text-[8px] text-rose-600 pl-2 font-bold select-none">
                          - NÃO MANDAR: {it.removedItems.join(', ')}
                        </p>
                      )}

                      {it.selectedUtensils && it.selectedUtensils.length > 0 && (
                        <p className="text-[8px] text-teal-600 pl-2 font-bold select-none">
                          + Utensílios: {it.selectedUtensils.map(u => u.name).join(', ')}
                        </p>
                      )}

                      {it.observation && (
                        <p className="text-[8px] italic text-slate-500 bg-slate-50 p-1 pl-2 font-sans select-none break-all leading-relaxed">
                          Obs: "{it.observation}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-0.5 text-[9px] border-b border-dashed border-slate-650 pb-1.5 font-mono">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {orderToPrint.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entrega Motoboy:</span>
                  <span>R$ {orderToPrint.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>TOTAL COMPENSADO:</span>
                  <span>R$ {orderToPrint.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-0.5 text-[8.5px] border-b pb-1.5">
                <p className="font-bold text-center mb-0.5 text-[9px]">DADOS DE ENTREGA</p>
                <p><strong>Destino:</strong> {orderToPrint.clientName}</p>
                <p><strong>Telefone:</strong> {orderToPrint.clientPhone}</p>
                <p><strong>Endereço:</strong> {orderToPrint.address.street}, {orderToPrint.address.number}</p>
                <p><strong>Bairro:</strong> {orderToPrint.address.neighborhood}</p>
                {orderToPrint.address.complement && <p><strong>Compl:</strong> {orderToPrint.address.complement}</p>}
                <p><strong>CEP:</strong> {orderToPrint.address.zipCode}</p>
                <p><strong>Hora Agendada:</strong> {orderToPrint.deliveryTime}</p>
                <p><strong>Forma Pago:</strong> {orderToPrint.paymentMethod}</p>
                {orderToPrint.address.changeFor && <p><strong>Troco de volta:</strong> {orderToPrint.address.changeFor}</p>}
              </div>

              <div className="text-center pt-2 text-[8px] space-y-1.5">
                <p className="leading-tight font-bold">AGRADECEMOS A PREFERÊNCIA!<br/>NÃO DEIXE DE MARCAR A GENTE NO INSTAGRAM.</p>
                
                {/* Barcode Mock Rendering */}
                <div className="w-full flex justify-center text-center select-none py-1.5 pb-0">
                  <div className="font-sans tracking-[3px] scale-x-120 font-bold select-none h-6 border-b-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-transparent opacity-85 w-44">
                    ||||||||||||||||||||||||||||
                  </div>
                </div>
                <p className="text-[7.5px] font-mono tracking-widest text-slate-500 select-none">CODE-{orderToPrint.id}</p>
              </div>
            </div>

            <button
              onClick={() => { window.print(); }}
              className="mt-5 w-full bg-slate-900 border hover:bg-slate-800 hover:text-white px-4 py-2 text-xs font-bold font-sans text-white uppercase tracking-wider rounded-lg flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4 animate-pulse" />
              <span>Imprimir Ordem</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT DELIVERY ORDER DATA */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-120 text-xs">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-3 border-b mb-4">
              <h3 className="font-bold text-slate-950 dark:text-white text-sm">Editar Detalhes de Pedido ({editingOrder.id})</h3>
            </div>

            <form onSubmit={handleSaveEditedOrder} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Nome Destinatário</label>
                <input
                  type="text"
                  required
                  value={editingOrder.clientName}
                  onChange={(e) => setEditingOrder({ ...editingOrder, clientName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-850 border p-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Telefone Celular</label>
                <input
                  type="text"
                  required
                  value={editingOrder.clientPhone}
                  onChange={(e) => setEditingOrder({ ...editingOrder, clientPhone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-850 border p-2.5 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Valor do Subtotal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingOrder.subtotal}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditingOrder({ ...editingOrder, subtotal: val, total: val + editingOrder.deliveryFee });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 border p-2.5 rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hora de Entrega</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.deliveryTime}
                    onChange={(e) => setEditingOrder({ ...editingOrder, deliveryTime: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-850 border p-2.5 rounded-xl text-center focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Endereço de Entrega</label>
                <input
                  type="text"
                  required
                  value={editingOrder.address.street}
                  onChange={(e) => setEditingOrder({
                    ...editingOrder,
                    address: { ...editingOrder.address, street: e.target.value }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-850 border p-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-4 font-semibold border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="bg-slate-105 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-505 bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl"
                >
                  Salvar Mudanças
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
