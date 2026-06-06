import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  ChevronLeft,
  MapPin,
  CreditCard,
  User,
  Phone,
} from 'lucide-react';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Cardapio,
  ProductDigitalMenu,
  DeliveryOrder,
  DeliveryOrderItem,
} from '../types';

interface PublicCardapioViewProps {
  menuId: string;
}

export default function PublicCardapioView({ menuId }: PublicCardapioViewProps) {
  const [cardapios, setCardapios] = useState<Cardapio[]>([]);
  const [products, setProducts] = useState<ProductDigitalMenu[]>([]);
  const [basket, setBasket] = useState<DeliveryOrderItem[]>([]);
  const [step, setStep] = useState<'browse' | 'checkout' | 'success'>('browse');
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Cartão' | 'Dinheiro'>('Pix');
  const [lastOrderId, setLastOrderId] = useState('');

  useEffect(() => {
    const loadPublicMenuData = async () => {
      try {
        const [menusSnap, productsSnap] = await Promise.all([
          getDocs(collection(db, 'cardapios')),
          getDocs(collection(db, 'productsDigitalMenu')),
        ]);

        const loadedMenus = menusSnap.docs.map((docSnap) => ({
          ...(docSnap.data() as Cardapio),
          id: docSnap.id,
        }));

        const loadedProducts = productsSnap.docs.map((docSnap) => ({
          ...(docSnap.data() as ProductDigitalMenu),
          id: docSnap.id,
        }));

        setCardapios(loadedMenus);
        setProducts(loadedProducts);
      } catch (error) {
        console.error('ERRO AO CARREGAR CARDÁPIO PÚBLICO:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPublicMenuData();
  }, []);

  const menu = useMemo(
    () => cardapios.find((item) => item.id === menuId),
    [cardapios, menuId]
  );

  const menuProducts = useMemo(() => {
    if (!menu) return [];
    return menu.productIds
      .map((id) => products.find((product) => product.id === id))
      .filter(Boolean) as ProductDigitalMenu[];
  }, [menu, products]);

  const subtotal = basket.reduce((sum, item) => sum + item.subtotal, 0);
  const deliveryFee = 7;
  const total = subtotal + deliveryFee;

  const handleAddProduct = (product: ProductDigitalMenu) => {
    const baseSize = product.tamanhos?.[0];

    const item: DeliveryOrderItem = {
      productId: product.id,
      productName: product.name,
      selectedSize: baseSize?.label || 'Único',
      selectedSizePrice: baseSize?.price || product.price,
      selectedAddons: [],
      removedItems: [],
      selectedUtensils: [],
      quantity: 1,
      subtotal: baseSize?.price || product.price,
    };

    setBasket((prev) => [...prev, item]);
  };

  const handleRemoveItem = (index: number) => {
    setBasket((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!menu || basket.length === 0) return;

    const orderId = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: DeliveryOrder = {
      id: orderId,
      clientId: `public_${customerPhone.replace(/\D/g, '') || Date.now()}`,
      clientName: customerName,
      clientPhone: customerPhone,
      items: basket,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      status: 'PEDIDO GERADO',
      createdAt: new Date().toISOString(),
      deliveryTime: 'Imediato',
      address: {
        name: customerName,
        phone: customerPhone,
        street,
        number,
        neighborhood,
        complement: complement || undefined,
      },
      channel: 'whatsapp',
      notes: `Pedido recebido via cardápio público: ${menu.name}`,
    };

    await setDoc(doc(db, 'deliveryOrders', orderId), newOrder, { merge: true });

    setLastOrderId(orderId);
    setBasket([]);
    setStep('success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Carregando cardápio...
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-sm">
          <h1 className="text-lg font-bold text-slate-900">Cardápio não encontrado</h1>
          <p className="text-sm text-slate-500 mt-2">
            O link acessado não corresponde a nenhum cardápio ativo.
          </p>
        </div>
      </div>
    );
  }

  if (!menu.active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-sm">
          <h1 className="text-lg font-bold text-slate-900">Cardápio indisponível</h1>
          <p className="text-sm text-slate-500 mt-2">
            Este cardápio está temporariamente inativo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto pb-28">
        <div className="relative h-56 bg-slate-900">
          <img
            src={menu.imageBanner}
            alt={menu.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
            <span className="text-xs font-bold text-amber-300 mb-2">
              Entrega hoje: {menu.availableHours}
            </span>
            <h1 className="text-2xl font-extrabold text-white">{menu.name}</h1>
            <p className="text-sm text-slate-200 mt-2">{menu.description}</p>
          </div>
        </div>

        {step === 'browse' && (
          <div className="p-4 space-y-4">
            <h2 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
              Produtos disponíveis
            </h2>

            {menuProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex gap-3 shadow-sm"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-24 h-24 rounded-xl object-cover bg-slate-100"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{product.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-2">
                    R$ {product.price.toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => handleAddProduct(product)}
                  className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 self-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {step === 'checkout' && (
          <form onSubmit={handleSubmitOrder} className="p-4 space-y-4">
            <button
              type="button"
              onClick={() => setStep('browse')}
              className="flex items-center gap-1 text-sm text-slate-500 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar ao cardápio
            </button>

            <div className="bg-white rounded-2xl border p-4 space-y-3">
              <h2 className="font-bold text-lg">Dados para entrega</h2>

              <input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome completo"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />

              <input
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="WhatsApp / Celular"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua"
                  className="col-span-2 border rounded-xl px-3 py-2 text-sm"
                />

                <input
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Nº"
                  className="border rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <input
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Bairro"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />

              <input
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Complemento"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />

              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão">Cartão</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-white font-bold py-3 rounded-2xl shadow-lg"
            >
              Finalizar Pedido
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-3xl border p-6 text-center max-w-sm shadow-sm">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-extrabold">Pedido recebido!</h2>
              <p className="text-sm text-slate-500 mt-2">
                Seu pedido foi enviado para a cozinha.
              </p>
              <p className="text-sm font-mono font-bold text-slate-900 mt-4">
                Nº {lastOrderId}
              </p>
            </div>
          </div>
        )}
      </div>

      {basket.length > 0 && step === 'browse' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                {basket.length} item(ns) no carrinho
              </p>
              <p className="text-lg font-extrabold text-emerald-600">
                R$ {total.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => setStep('checkout')}
              className="bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Ver carrinho
            </button>
          </div>
        </div>
      )}
    </div>
  );
}