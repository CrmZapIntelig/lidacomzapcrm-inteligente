/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, DollarSign, Calendar } from 'lucide-react';
import { Client, Order, OrderItem } from '../types';

interface OrderModalProps {
  client: Client;
  onClose: () => void;
  onSaveOrder: (order: Order) => void;
}

const STOCK_PRODUCTS = [
  { id: 'p1', name: 'Jaqueta Blazer Couro Ecológico', price: 349.90 },
  { id: 'p2', name: 'Regata Seda Básica Areia', price: 51.10 },
  { id: 'p3', name: 'Lote Atacado Calçados Sandálias Verão', price: 1600.00 },
  { id: 'p4', name: 'Caneca Cerâmica Personalizada Corretor', price: 45.00 },
  { id: 'p5', name: 'Kit Cremes Anti-age SkinCare', price: 120.00 },
];

export default function OrderModal({ client, onClose, onSaveOrder }: OrderModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(STOCK_PRODUCTS[0].id);
  const [quantity, setQuantity] = useState<number>(1);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('Pix');
  const [orderStatus, setOrderStatus] = useState<Order['status']>('Pendente');
  const [orderNotes, setOrderNotes] = useState<string>('');

  const handleAddItem = () => {
    const product = STOCK_PRODUCTS.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check if item already exists
    const existingIndex = orderItems.findIndex((item) => item.productName === product.name);
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += quantity;
      setOrderItems(updated);
    } else {
      const newItem: OrderItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        productName: product.name,
        price: product.price,
        quantity,
      };
      setOrderItems([...orderItems, newItem]);
    }
    setQuantity(1);
  };

  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Por favor, adicione pelo menos um produto ao pedido!');
      return;
    }

    const orderTotal = getOrderTotal();
    const newOrder: Order = {
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: client.id,
      clientName: client.name,
      items: orderItems,
      total: orderTotal,
      paymentMethod,
      status: orderStatus,
      createdAt: new Date().toISOString(),
      notes: orderNotes,
    };

    onSaveOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
        
        {/* Absolute Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Gerar Pedido Comercial</h3>
            <p className="text-xs text-slate-500">Emitindo orçamento / fatura para <strong>{client.name}</strong></p>
          </div>
        </div>

        <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
          
          {/* Section 1: Product choice */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-750 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Selecionar Produto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {STOCK_PRODUCTS.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (R$ {prod.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Qtd</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-800 dark:text-slate-200 text-center font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-2 rounded-xl flex items-center justify-center aspect-square shrink-0 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* List of current order items */}
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-200/40">
              <span className="block text-slate-400 font-semibold text-[10px]">PRODUTOS NO CARRINHO</span>
              {orderItems.length === 0 ? (
                <p className="text-[10px] text-slate-405 italic py-1.5">Nenhum produto adicionado ainda</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-32 overflow-y-auto scrollbar-thin">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-105 truncate">{item.productName}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.quantity}un. × R$ {item.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Form metadata payment types */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto">Boleto</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="PicPay">PicPay</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Status Financeiro</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-xl text-slate-850 dark:text-slate-200 font-bold focus:outline-none"
              >
                <option value="Pendente" className="text-amber-500">PENDENTE (Aguardando Pgto)</option>
                <option value="Pago" className="text-emerald-500">PAGO (Compensado)</option>
                <option value="Cancelado" className="text-rose-500">CANCELADO</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">Observações / Anotações Internas</label>
            <input
              type="text"
              placeholder="ex: Prefere correio Sedex, embrulhar para presente..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* Purchase billing preview box and Submits */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL DA ORDEM:</span>
              <p className="text-xl font-mono font-bold text-emerald-505 text-emerald-500">
                R$ {getOrderTotal().toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-250 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-emerald-505 bg-emerald-505 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-505/10 transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Salvar & Ativar Automação</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
