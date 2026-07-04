/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  loadData,
  saveData,
  INITIAL_CLIENTS,
  INITIAL_MESSAGES,
  INITIAL_HISTORY,
  INITIAL_CAMPAIGNS,
  INITIAL_ORDERS,
  INITIAL_AUTOMATIONS,
  DEFAULT_SETTINGS,
  INITIAL_PRODUCTS_DIGITAL_MENU,
  INITIAL_CARDAPIOS,
  INITIAL_DELIVERY_ORDERS,
  INITIAL_COURIERS,
  INITIAL_ROUTES,
  INITIAL_COURIER_REVIEWS,
  INITIAL_DELIVERY_HISTORIES,
} from './utils/mockData';
import { Client, Message, HistoryEvent, Order, Campaign, AutomationRule, AppSettings, FunnelStage, Courier, DeliveryRoute, CourierReview, DeliveryHistory } from './types';

// Import Views
import Sidebar from './components/Sidebar';
import PublicCardapioView from './components/PublicCardapioView';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import WhatsAppView from './components/WhatsAppView';
import CrmKanbanView from './components/CrmKanbanView';
import CampanhasView from './components/CampanhasView';
import DisparadorView from './components/DisparadorView';
import CardapioView from './components/CardapioView';
import CozinhaView from './components/CozinhaView';
import ProducaoView from './components/ProducaoView';
import EntregasView from './components/EntregasView';
import GestaoEntregasView from './components/GestaoEntregasView';
import EntregadoresView from './components/EntregadoresView';
import RotasView from './components/RotasView';
import RastreamentoView from './components/RastreamentoView';
import ClientesView from './components/ClientesView';
import AutomationsView from './components/AutomationsView';
import CentralInteligenteView from './components/CentralInteligenteView';
import RelatoriosView from './components/RelatoriosView';
import ConfiguracoesView from './components/ConfiguracoesView';
import OrderModal from './components/OrderModal';
import LoginView from './components/LoginView';
import CaixaView from './components/CaixaView';
import { ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { AuthSession, User, CaixaSession, CaixaTransaction } from './types';

import { db, auth as firebaseAuth } from './lib/firebase';
import { onAuthStateChanged, signOut, type User as FirebaseAuthUser } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, type DocumentData, type QuerySnapshot } from 'firebase/firestore';

const mapSnapshotWithId = <T,>(snapshot: QuerySnapshot<DocumentData>): T[] =>
  snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as T),
    id: docSnap.id,
  }));

const mapFirebaseUser = (firebaseUser: FirebaseAuthUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email || '',
  name: firebaseUser.displayName || firebaseUser.email || 'Usuário Firebase',
  role: 'administrador',
  active: true,
});

const CURRENT_TAB_STORAGE_KEY = 'lidacomzap_current_tab';

const isSameOperationalDate = (dateValue: string, comparisonDate = new Date()) => {
  const date = new Date(dateValue);
  return (
    date.getFullYear() === comparisonDate.getFullYear() &&
    date.getMonth() === comparisonDate.getMonth() &&
    date.getDate() === comparisonDate.getDate()
  );
};

export default function App() {

  useEffect(() => {
    console.log("Firebase conectado:", db);
  }, []);

  // Auth state
  const [auth, setAuth] = useState<AuthSession>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setAuth({
        user: firebaseUser ? mapFirebaseUser(firebaseUser) : null,
        token: null,
        isAuthenticated: !!firebaseUser,
      });
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.error('ERRO AO SAIR DO FIREBASE AUTH:', error);
    }
  };

  // 1. Core State Managers backed by LocalStorage
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const firestoreClients = mapSnapshotWithId<Client>(snapshot);
        const loadedClients = firestoreClients.length ? firestoreClients : INITIAL_CLIENTS;
        setClients(loadedClients);
        console.log(`FIRESTORE CLIENTS SINCRONIZADOS: ${loadedClients.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR CLIENTS FIRESTORE:', error);
        setClients(INITIAL_CLIENTS);
      }
    );

    return unsubscribe;
  }, []);

  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'messages'),
      (snapshot) => {
        const firestoreMessages: Record<string, Message[]> = {};
  
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as {
            clientId?: string;
            items?: Message[];
          };
  
          const clientId = data.clientId || docSnap.id;
  
          firestoreMessages[clientId] = Array.isArray(data.items)
            ? data.items
            : [];
        });
  
        const loadedMessages =
          Object.keys(firestoreMessages).length > 0
            ? firestoreMessages
            : INITIAL_MESSAGES;
  
        setMessages(loadedMessages);
  
        console.log(
          `FIRESTORE MESSAGES SINCRONIZADAS: ${Object.keys(loadedMessages).length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR MESSAGES FIRESTORE:',
          error
        );
  
        setMessages(INITIAL_MESSAGES);
      }
    );
  
    return unsubscribe;
  }, []);
  
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'history'),
      (snapshot) => {
        const firestoreHistory = mapSnapshotWithId<HistoryEvent>(snapshot);
        const loadedHistory = firestoreHistory.length
          ? firestoreHistory
          : INITIAL_HISTORY;
  
        setHistory(loadedHistory);
  
        console.log(`FIRESTORE HISTORY SINCRONIZADO: ${loadedHistory.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR HISTORY FIRESTORE:', error);
        setHistory(INITIAL_HISTORY);
      }
    );
  
    return unsubscribe;
  }, []);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'campaigns'),
      (snapshot) => {
        const firestoreCampaigns = mapSnapshotWithId<Campaign>(snapshot);
        const loadedCampaigns =
          firestoreCampaigns.length > 0
            ? firestoreCampaigns
            : INITIAL_CAMPAIGNS;
  
        setCampaigns(loadedCampaigns);
  
        console.log(
          `FIRESTORE CAMPAIGNS SINCRONIZADAS: ${loadedCampaigns.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR CAMPAIGNS FIRESTORE:',
          error
        );
  
        setCampaigns(INITIAL_CAMPAIGNS);
      }
    );
  
    return unsubscribe;
  }, []);
  
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const firestoreOrders = mapSnapshotWithId<Order>(snapshot);
        const loadedOrders =
          firestoreOrders.length > 0
            ? firestoreOrders
            : INITIAL_ORDERS;
  
        setOrders(loadedOrders);
  
        console.log(
          `FIRESTORE ORDERS SINCRONIZADOS: ${loadedOrders.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR ORDERS FIRESTORE:',
          error
        );
  
        setOrders(INITIAL_ORDERS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [automations, setAutomations] = useState<AutomationRule[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'automations'),
      (snapshot) => {
        const firestoreAutomations = mapSnapshotWithId<AutomationRule>(snapshot);
        const loadedAutomations =
          firestoreAutomations.length > 0
            ? firestoreAutomations
            : INITIAL_AUTOMATIONS;
  
        setAutomations(loadedAutomations);
  
        console.log(
          `FIRESTORE AUTOMATIONS SINCRONIZADAS: ${loadedAutomations.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR AUTOMATIONS FIRESTORE:',
          error
        );
  
        setAutomations(INITIAL_AUTOMATIONS);
      }
    );
  
    return unsubscribe;
  }, []);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'default'),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as AppSettings);
          console.log('FIRESTORE SETTINGS SINCRONIZADO');
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR SETTINGS FIRESTORE:',
          error
        );
  
        setSettings(DEFAULT_SETTINGS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [productsDigitalMenu, setProductsDigitalMenu] = useState(
    INITIAL_PRODUCTS_DIGITAL_MENU
  );
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'productsDigitalMenu'),
      (snapshot) => {
        const firestoreProducts = mapSnapshotWithId<any>(snapshot);
        const loadedProducts =
          firestoreProducts.length > 0
            ? firestoreProducts
            : INITIAL_PRODUCTS_DIGITAL_MENU;
  
        setProductsDigitalMenu(loadedProducts);
  
        console.log(
          `FIRESTORE PRODUCTS SINCRONIZADOS: ${loadedProducts.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR PRODUCTS FIRESTORE:',
          error
        );
  
        setProductsDigitalMenu(INITIAL_PRODUCTS_DIGITAL_MENU);
      }
    );
  
    return unsubscribe;
  }, []);

  const [cardapios, setCardapios] = useState(INITIAL_CARDAPIOS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'cardapios'),
      (snapshot) => {
        const firestoreCardapios = mapSnapshotWithId<any>(snapshot);
        const loadedCardapios =
          firestoreCardapios.length > 0
            ? firestoreCardapios
            : INITIAL_CARDAPIOS;
  
        setCardapios(loadedCardapios);
  
        console.log(
          `FIRESTORE CARDAPIOS SINCRONIZADOS: ${loadedCardapios.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR CARDAPIOS FIRESTORE:',
          error
        );
  
        setCardapios(INITIAL_CARDAPIOS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [deliveryOrders, setDeliveryOrders] = useState(INITIAL_DELIVERY_ORDERS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'deliveryOrders'),
      (snapshot) => {
        const firestoreDeliveryOrders = mapSnapshotWithId<any>(snapshot);
        const loadedDeliveryOrders =
          firestoreDeliveryOrders.length > 0
            ? firestoreDeliveryOrders
            : INITIAL_DELIVERY_ORDERS;
  
        setDeliveryOrders(loadedDeliveryOrders);
  
        console.log(
          `FIRESTORE DELIVERY ORDERS SINCRONIZADOS: ${loadedDeliveryOrders.length}`
        );
      },
      (error) => {
        console.error('ERRO AO CARREGAR DELIVERY ORDERS FIRESTORE:', error);
        setDeliveryOrders(INITIAL_DELIVERY_ORDERS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [couriers, setCouriers] = useState<Courier[]>(INITIAL_COURIERS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'couriers'),
      (snapshot) => {
        const firestoreCouriers = mapSnapshotWithId<Courier>(snapshot);
        const loadedCouriers =
          firestoreCouriers.length > 0
            ? firestoreCouriers
            : INITIAL_COURIERS;
  
        setCouriers(loadedCouriers);
  
        console.log(`FIRESTORE COURIERS SINCRONIZADOS: ${loadedCouriers.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR COURIERS FIRESTORE:', error);
        setCouriers(INITIAL_COURIERS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [routes, setRoutes] = useState<DeliveryRoute[]>(INITIAL_ROUTES);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'routes'),
      (snapshot) => {
        const firestoreRoutes = mapSnapshotWithId<DeliveryRoute>(snapshot);
        const loadedRoutes =
          firestoreRoutes.length > 0
            ? firestoreRoutes
            : INITIAL_ROUTES;
  
        setRoutes(loadedRoutes);
  
        console.log(`FIRESTORE ROUTES SINCRONIZADAS: ${loadedRoutes.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR ROUTES FIRESTORE:', error);
        setRoutes(INITIAL_ROUTES);
      }
    );
  
    return unsubscribe;
  }, []);

  const [reviews, setReviews] = useState<CourierReview[]>(INITIAL_COURIER_REVIEWS);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'reviews'),
      (snapshot) => {
        const firestoreReviews = mapSnapshotWithId<CourierReview>(snapshot);
        const loadedReviews =
          firestoreReviews.length > 0
            ? firestoreReviews
            : INITIAL_COURIER_REVIEWS;
  
        setReviews(loadedReviews);
  
        console.log(`FIRESTORE REVIEWS SINCRONIZADAS: ${loadedReviews.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR REVIEWS FIRESTORE:', error);
        setReviews(INITIAL_COURIER_REVIEWS);
      }
    );
  
    return unsubscribe;
  }, []);

  const [deliveryHistories, setDeliveryHistories] = useState<DeliveryHistory[]>(INITIAL_DELIVERY_HISTORIES);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'deliveryHistories'),
      (snapshot) => {
        const firestoreDeliveryHistories = mapSnapshotWithId<DeliveryHistory>(snapshot);
        const loadedDeliveryHistories =
          firestoreDeliveryHistories.length > 0
            ? firestoreDeliveryHistories
            : INITIAL_DELIVERY_HISTORIES;
  
        setDeliveryHistories(loadedDeliveryHistories);
  
        console.log(
          `FIRESTORE DELIVERY HISTORIES SINCRONIZADOS: ${loadedDeliveryHistories.length}`
        );
      },
      (error) => {
        console.error(
          'ERRO AO CARREGAR DELIVERY HISTORIES FIRESTORE:',
          error
        );
  
        setDeliveryHistories(INITIAL_DELIVERY_HISTORIES);
      }
    );
  
    return unsubscribe;
  }, []);

  const [activeCaixaSession, setActiveCaixaSession] = useState<CaixaSession | null>(null);
  const [caixaHistory, setCaixaHistory] = useState<CaixaSession[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'caixaSessions'),
      (snapshot) => {
        const firestoreSessions = mapSnapshotWithId<CaixaSession>(snapshot)
          .sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());

        setCaixaHistory(firestoreSessions);
        setActiveCaixaSession(
          firestoreSessions.find((session) => session.status === 'aberto') || null
        );

        console.log(`FIRESTORE CAIXA SESSIONS SINCRONIZADAS: ${firestoreSessions.length}`);
      },
      (error) => {
        console.error('ERRO AO CARREGAR CAIXA SESSIONS FIRESTORE:', error);
        setCaixaHistory([]);
        setActiveCaixaSession(null);
      }
    );

    return unsubscribe;
  }, []);

  // 2. Navigation & UI controls
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      return localStorage.getItem(CURRENT_TAB_STORAGE_KEY) || 'dashboard';
    } catch (error) {
      return 'dashboard';
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active client details in Chat
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Order modal triggers
  const [clientForOrder, setClientForOrder] = useState<Client | null>(null);

  // Sync to storage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_TAB_STORAGE_KEY, currentTab);
    } catch (error) {
      console.error('ERRO AO SALVAR ABA ATUAL:', error);
    }
  }, [currentTab]);

  useEffect(() => {
    saveData('clients', clients);
  }, [clients]);

  useEffect(() => {
    saveData('messages', messages);
  }, [messages]);

  useEffect(() => {
    saveData('history', history);
  }, [history]);

  useEffect(() => {
    saveData('campaigns', campaigns);
  }, [campaigns]);

  useEffect(() => {
    saveData('orders', orders);
  }, [orders]);

  useEffect(() => {
    saveData('automations', automations);
  }, [automations]);

  useEffect(() => {
    saveData('settings', settings);
  }, [settings]);

  useEffect(() => {
    saveData('productsDigitalMenu', productsDigitalMenu);
  }, [productsDigitalMenu]);

  useEffect(() => {
    saveData('cardapios', cardapios);
  }, [cardapios]);

  useEffect(() => {
    saveData('deliveryOrders', deliveryOrders);
  }, [deliveryOrders]);

  useEffect(() => {
    saveData('couriers', couriers);
  }, [couriers]);

  useEffect(() => {
    saveData('routes', routes);
  }, [routes]);

  useEffect(() => {
    saveData('reviews', reviews);
  }, [reviews]);

  useEffect(() => {
    saveData('deliveryHistories', deliveryHistories);
  }, [deliveryHistories]);

  // Handle active class settings matching 'dark' theme on DOM root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Sincronizar Firebase/Firestore simulation
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      // Generate nice notification event
      const newEvent: HistoryEvent = {
        id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        clientId: 'system',
        type: 'system_alert',
        title: 'Sincronização Firestore',
        description: 'Conexão Firebase sincronizada. Sincronismo integral efetuado com sucesso!',
        timestamp: new Date().toISOString(),
        operatorName: settings.operatorName,
      };
      setHistory((prev) => [newEvent, ...prev]);
      alert('Sincronização com o Firestore efetuada com sucesso! 0 novos leads inseridos.');
    }, 1200);
  };

  // Factory Database Reset
  const handleResetDatabase = () => {
    setClients(INITIAL_CLIENTS);
    setMessages(INITIAL_MESSAGES);
    setHistory(INITIAL_HISTORY);
    setCampaigns(INITIAL_CAMPAIGNS);
    setOrders(INITIAL_ORDERS);
    setAutomations(INITIAL_AUTOMATIONS);
    setSettings(DEFAULT_SETTINGS);
    setProductsDigitalMenu(INITIAL_PRODUCTS_DIGITAL_MENU);
    setCardapios(INITIAL_CARDAPIOS);
    setDeliveryOrders(INITIAL_DELIVERY_ORDERS);
    setSelectedClient(null);
    setCurrentTab('dashboard');
  };

// 3. Central History Logger
const handleAddHistoryEvent = async (clientId: string, type: any, title: string, description: string) => {
  const newEvent: HistoryEvent = {
    id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    clientId,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    operatorName: settings.operatorName,
  };

  setHistory((prev) => [newEvent, ...prev]);

  try {
    await setDoc(doc(db, 'history', newEvent.id), newEvent);
    console.log(`HISTORY ATUALIZADO FIRESTORE: ${newEvent.id}`);
  } catch (error) {
    console.error('ERRO AO ATUALIZAR HISTORY FIRESTORE:', error);
  }
};

  // 4. Client modification callback
  const handleUpdateClient = async (updated: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    // If we're updating the currently focused client inside WhatsApp Chat, update focus state too
    if (selectedClient && selectedClient.id === updated.id) {
      setSelectedClient(updated);
    }

    try {
      console.log('CLIENTE COMPLETO ENVIADO:', updated);
      console.log('NOME ENVIADO:', updated.name);
      await setDoc(doc(db, 'clients', updated.id), updated, { merge: true });
      console.log(`CLIENTE ATUALIZADO FIRESTORE: ${updated.id}`);
    } catch (error) {
      console.error('ERRO AO ATUALIZAR CLIENTE FIRESTORE', error);
    }
  };

  // 5. Intelligent chatbot simulation on message sent
  const handleSendMessage = async (clientId: string, text: string, type: any = 'text', fileName?: string) => {
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const targetClient = clients.find((c) => c.id === clientId);
    const clientChannel = targetClient?.channel === 'ambos' || !targetClient?.channel ? 'whatsapp' : targetClient.channel;
  
    const saveMessagesToFirestore = async (targetClientId: string, list: Message[]) => {
      try {
        const cleanList = list.map((message) =>
          Object.fromEntries(
            Object.entries(message).filter(([, value]) => value !== undefined)
          )
        ) as Message[];
    
        await setDoc(
          doc(db, 'messages', targetClientId),
          {
            clientId: targetClientId,
            items: cleanList,
          },
          { merge: true }
        );
    
        console.log(`MESSAGES ATUALIZADAS FIRESTORE: ${targetClientId}`);
      } catch (error) {
        console.error('ERRO AO ATUALIZAR MESSAGES FIRESTORE:', error);
      }
    };
  
    const operatorMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sender: 'operador',
      text,
      timestamp: timeNow,
      type,
      fileName,
      channel: clientChannel,
    };
  
    // Append operator message to list and persist to Firestore
    setMessages((prev) => {
      const existing = prev[clientId] || [];
      const updatedList = [...existing, operatorMsg];
  
      saveMessagesToFirestore(clientId, updatedList);
  
      return { ...prev, [clientId]: updatedList };
    });
  
    // Toggle Automation check SE "mensagem enviada" ENTÃO "Etapa = Lead"
    if (targetClient && targetClient.stage === 'Rascunho') {
      const isLeadRuleActive = automations.find((a) => a.id === 'aut_2')?.active;
      if (isLeadRuleActive) {
        const updated = { ...targetClient, stage: 'Lead' as const };
        handleUpdateClient(updated);
        handleAddHistoryEvent(clientId, 'stage_change', 'Automação (Gatilho)', 'Automação disparada: Rascunho atualizado AUTOMATICAMENTE para LEAD após envio de mensagem proativa.');
      }
    }
  
    // Trigger AI Simulated reply if the sender was operator and not a silent attachments system.
    if (type === 'text') {
      setTimeout(() => {
        // Compute smart responder text
        let replyText = 'Perfeito! Vou avaliar aqui e te aviso.';
        const lowerText = text.toLowerCase();
  
        if (lowerText.includes('catalogo') || lowerText.includes('catálogo')) {
          replyText = 'Nossa, que peças lindas! Qual o frete convencional para o Rio de Janeiro?';
        } else if (lowerText.includes('cupom') || lowerText.includes('desconto')) {
          replyText = 'Quero cupom sim! Me manda o Pix que vou fechar agora!';
        } else if (lowerText.includes('boleto')) {
          replyText = 'Certo, vou fazer o pagamento amanhã de manhã sem falta.';
        } else if (lowerText.includes('jaqueta') || lowerText.includes('blazer')) {
          replyText = 'Esse modelo tem tamanho P disponível também? Ou só M?';
        }
  
        const clientMsg: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sender: 'cliente',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          channel: clientChannel,
        };
  
        // Append simulated client response and persist to Firestore
        setMessages((prev) => {
          const list = prev[clientId] || [];
          const updatedList = [...list, clientMsg];
  
          saveMessagesToFirestore(clientId, updatedList);
  
          return { ...prev, [clientId]: updatedList };
        });
  
        // Toggle Automation check SE "cliente respondeu" ENTÃO "Etapa = Em Atendimento"
        if (targetClient && targetClient.stage !== 'Em atendimento') {
          const isMsgReplyRuleActive = automations.find((a) => a.id === 'aut_3')?.active;
          if (isMsgReplyRuleActive) {
            // Get freshly-updated client stage
            setClients((currentClients) => {
              const currentTarget = currentClients.find((c) => c.id === clientId);
              if (currentTarget && currentTarget.stage !== 'Em atendimento') {
                const finalUpdated = { ...currentTarget, stage: 'Em atendimento' as const };
                // Also trigger historic logging
                handleAddHistoryEvent(clientId, 'stage_change', 'Automação (Resposta)', 'Automação disparada: Mover para EM ATENDIMENTO após resposta automática recebida do lead.');
  
                // If focused in chat
                if (selectedClient && selectedClient.id === clientId) {
                  setSelectedClient(finalUpdated);
                }
  
                return currentClients.map((c) => (c.id === clientId ? finalUpdated : c));
              }
              return currentClients;
            });
          }
        }
      }, 1500);
    }
  };

 // 6. Billing order submission callback
const handleSaveOrderCreated = async (newOrder: Order) => {
  setOrders((prev) => [newOrder, ...prev]);

  try {
    const cleanOrder = JSON.parse(JSON.stringify(newOrder));
    await setDoc(doc(db, 'orders', newOrder.id), cleanOrder, { merge: true });
    console.log(`ORDER ATUALIZADO FIRESTORE: ${newOrder.id}`);
  } catch (error) {
    console.error('ERRO AO ATUALIZAR ORDER FIRESTORE:', error);
  }

  if (newOrder.status === 'Pago') {
    handleRegisterPaidOrderInCashier({
      id: newOrder.id,
      total: newOrder.total,
      paymentMethod: newOrder.paymentMethod,
      source: 'order',
    });
  }

  // Bind orders status stats to customer total comprado
  const targetCli = clients.find((c) => c.id === newOrder.clientId);
  if (targetCli) {
    const boughtUpdate = newOrder.status === 'Pago'
      ? targetCli.totalBought + newOrder.total
      : targetCli.totalBought;

    // Update client funnel stage to 'Pedido gerado' or 'Pago' automatically
    let stageVal: FunnelStage = 'Pedido gerado';
    let ruleTriggerTitle = 'Automação (Pedido Gerado)';
    let ruleTriggerText = 'Novo faturamento emitido no modal: Etapa atualizada AUTOMATICAMENTE para PEDIDO GERADO.';

    if (newOrder.status === 'Pago') {
      stageVal = 'Pago';
      ruleTriggerTitle = 'Automação (Pagamento Aprovado)';
      ruleTriggerText = 'Ordem financeira gerada como PAGA: Etapa atualizada AUTOMATICAMENTE para PAGO.';
    }

    // Check toggled automations
    const isPedidoRuleActive = automations.find((a) => a.id === 'aut_4')?.active;
    const isPagoRuleActive = automations.find((a) => a.id === 'aut_5')?.active;

    const finalStage = (stageVal === 'Pedido gerado' && isPedidoRuleActive) || (stageVal === 'Pago' && isPagoRuleActive)
      ? stageVal
      : targetCli.stage;

    const updatedCli = {
      ...targetCli,
      totalBought: boughtUpdate,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
      stage: finalStage,
    };

    handleUpdateClient(updatedCli);

    // Save dynamic log history event
    handleAddHistoryEvent(
      newOrder.clientId,
      'order_created',
      ruleTriggerTitle,
      `${ruleTriggerText} Código: ${newOrder.id} - Total: R$ ${newOrder.total.toFixed(2)}`
    );

    // Inject simulated message into timeline
    const orderMessageText = `🛒 *PEDIDO GERADO:* Código: *${newOrder.id}*\n------------------------------\n${newOrder.items.map((it) => `${it.quantity}x ${it.productName}`).join('\n')}\n------------------------------\nTotal: *R$ ${newOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\nForma de Pagamento: *${newOrder.paymentMethod}*\nStatus: *${newOrder.status === 'Pago' ? 'Aprovado ✅' : 'Aguardando Pagamento ⏳'}`;

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const systemMessage: Message = {
      id: `msg_sys_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sender: 'sistema',
      text: orderMessageText,
      timestamp: timeNow,
    };

    setMessages((prev) => {
      const list = prev[newOrder.clientId] || [];
      const updatedList = [...list, systemMessage];

      setDoc(
        doc(db, 'messages', newOrder.clientId),
        {
          clientId: newOrder.clientId,
          items: JSON.parse(JSON.stringify(updatedList)),
        },
        { merge: true }
      )
        .then(() => console.log(`MESSAGES ATUALIZADAS FIRESTORE: ${newOrder.clientId}`))
        .catch((error) => console.error('ERRO AO ATUALIZAR MESSAGES FIRESTORE:', error));

      return { ...prev, [newOrder.clientId]: updatedList };
    });
  }
};

const handleToggleAutomation = async (ruleId: string) => {
  let updatedRule: AutomationRule | null = null;

  setAutomations((prev) =>
    prev.map((r) => {
      if (r.id === ruleId) {
        updatedRule = { ...r, active: !r.active };
        return updatedRule;
      }
      return r;
    })
  );

  if (updatedRule) {
    try {
      await setDoc(doc(db, 'automations', ruleId), updatedRule, { merge: true });
      console.log(`AUTOMATION ATUALIZADA FIRESTORE: ${ruleId}`);
    } catch (error) {
      console.error('ERRO AO ATUALIZAR AUTOMATION FIRESTORE:', error);
    }
  }
};

const handleRegisterPaidOrderInCashier = (paidOrder: {
  id: string;
  total: number;
  paymentMethod?: string;
  source: 'order' | 'deliveryOrder';
}) => {
  const openedSession =
    activeCaixaSession?.status === 'aberto'
      ? activeCaixaSession
      : caixaHistory.find((session) => session.status === 'aberto');

  if (!openedSession) {
    console.warn('Pedido pago sem caixa aberto.');
    return;
  }

  const now = new Date().toISOString();
  const currentUser = auth.user;
  const orderPrefix = paidOrder.source === 'order' ? 'PED' : 'DEL';

  setActiveCaixaSession((currentSession) => {
    const sessionToUpdate =
      currentSession?.status === 'aberto' ? currentSession : openedSession;

    if (!sessionToUpdate) return currentSession;

    const alreadyRegistered = sessionToUpdate.transactions.some(
      (transaction) =>
        transaction.orderId === paidOrder.id && transaction.source === paidOrder.source
    );

    if (alreadyRegistered) return sessionToUpdate;

    const newTx: CaixaTransaction = {
      id: `tx_venda_${paidOrder.source}_${paidOrder.id}_${Date.now()}`,
      sessionId: sessionToUpdate.id,
      type: 'venda',
      value: paidOrder.total,
      description: `Venda vinculada ao pedido ${orderPrefix} ${paidOrder.id}`,
      method: paidOrder.paymentMethod || 'Dinheiro',
      orderId: paidOrder.id,
      source: paidOrder.source,
      timestamp: now,
      operatorId: currentUser?.id || sessionToUpdate.operatorId,
      operatorName: currentUser?.name || sessionToUpdate.operatorName,
    };

    const updatedSession: CaixaSession = {
      ...sessionToUpdate,
      currentBalance: sessionToUpdate.currentBalance + paidOrder.total,
      transactions: [newTx, ...sessionToUpdate.transactions],
      updatedAt: now,
    };

    setDoc(doc(db, 'caixaSessions', updatedSession.id), updatedSession, { merge: true })
      .then(() => console.log(`VENDA REGISTRADA NO CAIXA: ${paidOrder.id}`))
      .catch((error) => console.error('ERRO AO REGISTRAR VENDA NO CAIXA:', error));

    return updatedSession;
  });
};

const handleOpenCashier = async (initialBalance: number) => {
  const openedSession =
    activeCaixaSession?.status === 'aberto'
      ? activeCaixaSession
      : caixaHistory.find((session) => session.status === 'aberto');

  if (openedSession) {
    alert('Já existe um caixa aberto. Feche a sessão atual antes de abrir outro.');
    return;
  }

  const now = new Date().toISOString();
  const currentUser = auth.user;
  const newSession: CaixaSession = {
    id: `caixa_${Date.now()}`,
    operatorId: currentUser?.id || 'usr_prato_mineiro',
    operatorName: currentUser?.name || settings.operatorName || 'Administrador (Prato Mineiro)',
    openedAt: now,
    initialBalance,
    currentBalance: initialBalance,
    status: 'aberto',
    transactions: [],
    createdAt: now,
    updatedAt: now,
  };

  setActiveCaixaSession(newSession);

  try {
    await setDoc(doc(db, 'caixaSessions', newSession.id), newSession, { merge: true });
    console.log(`CAIXA ABERTO FIRESTORE: ${newSession.id}`);
  } catch (error) {
    console.error('ERRO AO ABRIR CAIXA FIRESTORE:', error);
  }
};

const handleRegisterCaixaTransaction = async (
  type: CaixaTransaction['type'],
  value: number,
  description: string
) => {
  if (!activeCaixaSession) return;

  const now = new Date().toISOString();
  const currentUser = auth.user;
  const newTx: CaixaTransaction = {
    id: `tx_${Date.now()}`,
    sessionId: activeCaixaSession.id,
    type,
    value,
    description,
    method: 'Dinheiro',
    timestamp: now,
    operatorId: currentUser?.id || activeCaixaSession.operatorId,
    operatorName: currentUser?.name || activeCaixaSession.operatorName,
  };

  const currentBalance =
    type === 'entrada' || type === 'venda'
      ? activeCaixaSession.currentBalance + value
      : activeCaixaSession.currentBalance - value;

  const updatedSession: CaixaSession = {
    ...activeCaixaSession,
    currentBalance,
    transactions: [newTx, ...activeCaixaSession.transactions],
    updatedAt: now,
  };

  setActiveCaixaSession(updatedSession);

  try {
    await setDoc(doc(db, 'caixaSessions', updatedSession.id), updatedSession, { merge: true });
    console.log(`MOVIMENTACAO CAIXA FIRESTORE: ${newTx.id}`);
  } catch (error) {
    console.error('ERRO AO REGISTRAR MOVIMENTACAO CAIXA FIRESTORE:', error);
  }
};

const handleCloseCashier = async (closingData: {
  dinheiro: number;
  cartao: number;
  pix: number;
  notaFiado: number;
  notes: string;
}) => {
  if (!activeCaixaSession) return;

  const now = new Date().toISOString();
  const closingBreakdown = {
    dinheiro: closingData.dinheiro || 0,
    cartao: closingData.cartao || 0,
    pix: closingData.pix || 0,
    notaFiado: closingData.notaFiado || 0,
  };
  const expectedBalance = activeCaixaSession.currentBalance;
  const countedBalance =
    closingBreakdown.dinheiro +
    closingBreakdown.cartao +
    closingBreakdown.pix +
    closingBreakdown.notaFiado;
  const closedAsLate = !isSameOperationalDate(activeCaixaSession.openedAt);

  const closedSession: CaixaSession = {
    ...activeCaixaSession,
    status: 'fechado',
    closedAt: now,
    closingBreakdown,
    closingNotes: closingData.notes || '',
    expectedBalance,
    countedBalance,
    difference: countedBalance - expectedBalance,
    closedAsLate,
    originalOpenedAt: activeCaixaSession.openedAt,
    closedOperationalDate: now,
    closingReason: closedAsLate ? 'fechamento_atrasado' : 'fechamento_normal',
    updatedAt: now,
  };

  setActiveCaixaSession(null);

  try {
    await setDoc(doc(db, 'caixaSessions', closedSession.id), closedSession, { merge: true });
    console.log(`CAIXA FECHADO FIRESTORE: ${closedSession.id}`);
  } catch (error) {
    console.error('ERRO AO FECHAR CAIXA FIRESTORE:', error);
  }
};

  
// Centralized Firestore persistence for delivery orders
const handleUpdateDeliveryOrders = async (updater: any) => {
  setDeliveryOrders((prev) => {
    const nextDeliveryOrders =
      typeof updater === 'function' ? updater(prev) : updater;

    nextDeliveryOrders.forEach((deliveryOrder: any) => {
      const previousOrder = prev.find((item: any) => item.id === deliveryOrder.id);
      const cleanDeliveryOrder = JSON.parse(JSON.stringify(deliveryOrder));

      setDoc(doc(db, 'deliveryOrders', deliveryOrder.id), cleanDeliveryOrder, { merge: true })
        .catch((error) => console.error('ERRO AO ATUALIZAR DELIVERY ORDER FIRESTORE:', error));

      if (deliveryOrder.status === 'FECHADO' && previousOrder?.status !== 'FECHADO') {
        handleRegisterPaidOrderInCashier({
          id: deliveryOrder.id,
          total: deliveryOrder.total || 0,
          paymentMethod: deliveryOrder.paymentMethod || 'Dinheiro',
          source: 'deliveryOrder',
        });
      }

      if (previousOrder && previousOrder.status !== deliveryOrder.status) {
        const historyId = `dh_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
        const historyEvent = {
          id: historyId,
          orderId: deliveryOrder.id,
          courierId: deliveryOrder.courierId || '',
          courierName: deliveryOrder.courierName || '',
          clientName: deliveryOrder.clientName || '',
          totalWithFee: deliveryOrder.total || 0,
          deliveredAt: new Date().toISOString(),
          status: 'SUCESSO',
          avgSpeed: 0,
          type: 'status_change',
          previousStatus: previousOrder.status,
          newStatus: deliveryOrder.status,
          description: `Pedido ${deliveryOrder.id} alterado de ${previousOrder.status} para ${deliveryOrder.status}`,
          createdAt: new Date().toISOString(),
        };
        setDeliveryHistories((current)=>[historyEvent as any,...current]);
        setDoc(doc(db,'deliveryHistories',historyId),historyEvent,{merge:true}).catch(()=>{});
      }
    });

    return nextDeliveryOrders;
  });
};

// 7. Calculate overall pipeline value
  const totalPipeline = clients
    .filter((c) => c.stage !== 'Fechado')
    .reduce((v, c) => v + (c.totalBought > 0 ? c.totalBought : 155), 0);

  const formatCurrency = (val: number) => {
    return `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  };

  const publicCardapioMatch = window.location.pathname.match(/^\/cardapio\/([^/]+)$/);

if (publicCardapioMatch) {
  return <PublicCardapioView menuId={publicCardapioMatch[1]} />;
}

  if (!auth.isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className={`min-h-screen font-sans antialiased text-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 flex transition-colors duration-150`}>
      
      {/* 1. Left Sidebar Navigation Panel */}
      <Sidebar
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        settings={settings}
        pipelineValue={formatCurrency(totalPipeline)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header Workspace Options */}
        <Header
          settings={settings}
          onUpdateSettings={async (s) => {
  const updatedSettings = { ...settings, ...s };
  setSettings(updatedSettings);

  try {
    await setDoc(doc(db, 'settings', 'default'), updatedSettings, { merge: true });
    console.log('SETTINGS ATUALIZADO FIRESTORE');
  } catch (error) {
    console.error('ERRO AO ATUALIZAR SETTINGS FIRESTORE:', error);
  }
}}

          onToggleMobileMenu={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTriggerSync={handleTriggerSync}
          syncing={isSyncing}
          currentUser={auth.user || undefined}
          onLogout={handleLogout}
        />

        {/* Content Tabs Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          {currentTab === 'dashboard' && (
            <DashboardView
              clients={clients}
              orders={orders}
              messages={messages}
              onChangeTab={setCurrentTab}
              onSelectClientInChat={setSelectedClient}
            />
          )}

          {currentTab === 'caixa' && (
            <CaixaView
              activeSession={activeCaixaSession}
              lastClosedSession={caixaHistory.find((session) => session.status === 'fechado') || null}
              currentUser={auth.user}
              onOpenCashier={handleOpenCashier}
              onRegisterTransaction={handleRegisterCaixaTransaction}
              onCloseCashier={handleCloseCashier}
            />
          )}

          {currentTab === 'whatsapp' && (
            <WhatsAppView
              clients={clients}
              messages={messages}
              onSendMessage={handleSendMessage}
              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={(id, type, head, desc) => handleAddHistoryEvent(id, type, head, desc)}
              selectedClient={selectedClient}
              onSelectClient={setSelectedClient}
              onOpenOrderModal={setClientForOrder}
            />
          )}

          {currentTab === 'crm' && (
            <CrmKanbanView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={handleAddHistoryEvent}
              onChangeTab={setCurrentTab}
              onSelectClientInChat={setSelectedClient}
            />
          )}

{currentTab === 'campanhas' && (
  <CampanhasView
    campaigns={campaigns}
    onAddCampaign={async (camp) => {
      setCampaigns((prev) => [camp, ...prev]);

      try {
        const cleanCampaign = JSON.parse(JSON.stringify(camp));
        await setDoc(doc(db, 'campaigns', camp.id), cleanCampaign, { merge: true });
        console.log(`CAMPAIGN ATUALIZADA FIRESTORE: ${camp.id}`);
      } catch (error) {
        console.error('ERRO AO ATUALIZAR CAMPAIGN FIRESTORE:', error);
      }
    }}
  />
)}
          {currentTab === 'disparador' && (
            <DisparadorView
              clients={clients}
              settings={settings}
              onUpdateSettings={async (s) => {
                const updatedSettings = { ...settings, ...s };
                setSettings(updatedSettings);
              
                try {
                  await setDoc(doc(db, 'settings', 'default'), updatedSettings, { merge: true });
                  console.log('SETTINGS ATUALIZADO FIRESTORE');
                } catch (error) {
                  console.error('ERRO AO ATUALIZAR SETTINGS FIRESTORE:', error);
                }
              }}

              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={handleAddHistoryEvent}
              onSendMessage={handleSendMessage}
            />
          )}

          {currentTab === 'cardapio' && (
            <CardapioView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={handleAddHistoryEvent}
              onSendMessage={handleSendMessage}
              cardapios={cardapios}
              setCardapios={async (updater) => {
  setCardapios((prev) => {
    const nextCardapios =
      typeof updater === 'function'
        ? updater(prev)
        : updater;

    nextCardapios.forEach((cardapio: any) => {
      const cleanCardapio = JSON.parse(JSON.stringify(cardapio));

      setDoc(doc(db, 'cardapios', cardapio.id), cleanCardapio, { merge: true })
        .then(() => console.log(`CARDAPIO ATUALIZADO FIRESTORE: ${cardapio.id}`))
        .catch((error) => console.error('ERRO AO ATUALIZAR CARDAPIO FIRESTORE:', error));
    });

    return nextCardapios;
  });
}}
              products={productsDigitalMenu}
              setProducts={async (updater) => {
  setProductsDigitalMenu((prev) => {
    const nextProducts =
      typeof updater === 'function'
        ? updater(prev)
        : updater;

    nextProducts.forEach((product: any) => {
      const cleanProduct = JSON.parse(JSON.stringify(product));

      setDoc(doc(db, 'productsDigitalMenu', product.id), cleanProduct, { merge: true })
        .then(() => console.log(`PRODUCT ATUALIZADO FIRESTORE: ${product.id}`))
        .catch((error) => console.error('ERRO AO ATUALIZAR PRODUCT FIRESTORE:', error));
    });

    return nextProducts;
  });
}}
              deliveryOrders={deliveryOrders}
              setDeliveryOrders={handleUpdateDeliveryOrders}
/>
)}

{currentTab === 'cozinha' && (
            <CozinhaView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={handleAddHistoryEvent}
              onSendMessage={handleSendMessage}
              deliveryOrders={deliveryOrders}
              setDeliveryOrders={handleUpdateDeliveryOrders}
              products={productsDigitalMenu}
              setProducts={setProductsDigitalMenu}
            />
          )}

          {currentTab === 'producao' && (
            <ProducaoView
              deliveryOrders={deliveryOrders}
              setDeliveryOrders={handleUpdateDeliveryOrders}
            />
          )}

{currentTab === 'gestao_entregas' && (
  <GestaoEntregasView
    couriers={couriers}
    setCouriers={async (updater: any) => {
      setCouriers((prev) => {
        const nextCouriers =
          typeof updater === 'function'
            ? updater(prev)
            : updater;
    
        nextCouriers.forEach((courier: any) => {
          const cleanCourier = JSON.parse(JSON.stringify(courier));
    
          setDoc(doc(db, 'couriers', courier.id), cleanCourier, { merge: true })
            .then(() => console.log(`COURIER ATUALIZADO FIRESTORE: ${courier.id}`))
            .catch((error) => console.error('ERRO AO ATUALIZAR COURIER FIRESTORE:', error));
        });
    
        return nextCouriers;
      });
    }}
    reviews={reviews}
    setReviews={setReviews}
    routes={routes}
    setRoutes={setRoutes}
    messages={messages}
    setMessages={setMessages}
    deliveryOrders={deliveryOrders}
    setDeliveryOrders={handleUpdateDeliveryOrders}
  />
)}

          

          

          

          {currentTab === 'pedidos' && (
            <div className="space-y-6 font-sans">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Relatório Geral de Pedidos</h2>
                <p className="text-sm text-slate-550 dark:text-slate-400">Ordens de serviço faturadas pelo operador no chat.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-805 border-b border-light-100 dark:border-slate-800 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Produtos Adquiridos</th>
                        <th className="py-3 px-4">Meio Pgto</th>
                        <th className="py-3 px-4">Total Ordem</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {orders.map((ord) => (
                        <tr key={ord.id}>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{ord.id}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-350">{ord.clientName}</td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate">{ord.items.map((i) => `${i.quantity}un. × ${i.productName}`).join(', ')}</td>
                          <td className="py-3.5 px-4 font-mono">{ord.paymentMethod}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-505 text-emerald-500">R$ {ord.total.toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            {ord.status === 'Pago' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                PAGO
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                                PENDENTE
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'clientes' && (
            <ClientesView
              clients={clients}
              onUpdateClient={handleUpdateClient}
              onAddHistoryEvent={handleAddHistoryEvent}
            />
          )}

          {currentTab === 'automations' && (
            <AutomationsView
              rules={automations}
              onToggleRule={handleToggleAutomation}
            />
          )}

          {currentTab === 'central' && (
            <CentralInteligenteView
              clients={clients}
              orders={orders}
            />
          )}

          {currentTab === 'relatorios' && (
            <RelatoriosView
              clients={clients}
              orders={orders}
              campaigns={campaigns}
            />
          )}

          {currentTab === 'configuracoes' && (
            <ConfiguracoesView
              settings={settings}
              onUpdateSettings={async (s) => {
  const updatedSettings = { ...settings, ...s };
  setSettings(updatedSettings);

  try {
    await setDoc(doc(db, 'settings', 'default'), updatedSettings, { merge: true });
    console.log('SETTINGS ATUALIZADO FIRESTORE');
  } catch (error) {
    console.error('ERRO AO ATUALIZAR SETTINGS FIRESTORE:', error);
  }
}}

              onResetDatabase={handleResetDatabase}
            />
          )}
        </main>
      </div>

      {/* 3. ABSOLUTE GLOBAL OVERLAYS: billing generation modal inside conversation workspace */}
      {clientForOrder && (
        <OrderModal
          client={clientForOrder}
          onClose={() => setClientForOrder(null)}
          onSaveOrder={handleSaveOrderCreated}
        />
      )}

    </div>
  );
}
