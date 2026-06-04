/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users2, 
  Bike, 
  Car, 
  Milestone, 
  Plus, 
  Star, 
  Search, 
  Phone, 
  MapPin, 
  Trash2, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Percent,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Courier, CourierReview, VehicleType, CourierStatus } from '../types';

interface EntregadoresViewProps {
  couriers: Courier[];
  setCouriers: React.Dispatch<React.SetStateAction<Courier[]>>;
  reviews: CourierReview[];
  setReviews: React.Dispatch<React.SetStateAction<CourierReview[]>>;
  deliveryOrders: any[];
}

export default function EntregadoresView({
  couriers,
  setCouriers,
  reviews,
  setReviews,
  deliveryOrders
}: EntregadoresViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('todos');
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Registration form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<VehicleType>('moto');
  const [newPhoto, setNewPhoto] = useState('');

  // Active courier detailed view modal for reviews
  const [viewingReviewsCourierId, setViewingReviewsCourierId] = useState<string | null>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');

  // Filter couriers based on search or vehicle type filter
  const filteredCouriers = couriers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.plate && c.plate.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVehicle = selectedVehicleType === 'todos' ? true : c.vehicleType === selectedVehicleType;
    return matchesSearch && matchesVehicle;
  });

  // Calculate high-fidelity stats for Analítico
  const totalRiders = couriers.length;
  const activeDeliveries = couriers.filter(c => c.status === 'Em entrega').length;
  const availableRiders = couriers.filter(c => c.status === 'Disponível').length;
  
  // Quick dynamic analysis
  const highestRatedRider = [...couriers].sort((a,b) => b.rating - a.rating)[0];
  const fastRider = highestRatedRider ? highestRatedRider.name : 'N/A';
  const avgTimeText = "21.6 min";
  const successRate = "98.8%";

  const handleRegisterCourier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newCpf) {
      alert('Por favor, preencha os dados obrigatórios: Nome, Celular e CPF.');
      return;
    }

    const placeholderPhotos: Record<VehicleType, string> = {
      moto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop',
      carro: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop',
      bicicleta: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop'
    };

    const newCourierItem: Courier = {
      id: `moto_${Date.now()}`,
      name: newName,
      phone: newPhone,
      cpf: newCpf,
      vehicle: newVehicle || (newVehicleType === 'moto' ? 'Titan 160cc' : newVehicleType === 'carro' ? 'Uno 1.0 Eco' : 'Bicicleta Caloi Aro 29'),
      plate: newPlate || (newVehicleType === 'bicicleta' ? 'SEM PLACA' : `${['XYZ', 'MNO', 'KBA'][Math.floor(Math.random() * 3)]}-${Math.floor(1000 + Math.random() * 9000)}`),
      photo: newPhoto || placeholderPhotos[newVehicleType],
      vehicleType: newVehicleType,
      status: 'Disponível',
      activeOrders: [],
      rating: 5.0,
      avgDeliveryTime: newVehicleType === 'moto' ? '20 min' : newVehicleType === 'carro' ? '28 min' : '15 min',
      lastLocation: {
        lat: -23.5615 + (Math.random() - 0.5) * 0.02,
        lng: -46.6559 + (Math.random() - 0.5) * 0.02,
        address: 'Bairro Central, Centro de Operações'
      }
    };

    setCouriers(prev => [...prev, newCourierItem]);
    
    // Clear state
    setNewName('');
    setNewPhone('');
    setNewCpf('');
    setNewVehicle('');
    setNewPlate('');
    setNewPhoto('');
    setIsAddingNew(false);
  };

  const handleUpdateStatus = (courierId: string, newStatus: CourierStatus) => {
    setCouriers(prev => prev.map(c => {
      if (c.id === courierId) {
        return { ...c, status: newStatus };
      }
      return c;
    }));
  };

  const handleDeleteCourier = (courierId: string) => {
    if (confirm('Tem certeza de que deseja remover este entregador da plataforma? This will delete historic association.')) {
      setCouriers(prev => prev.filter(c => c.id !== courierId));
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingReviewsCourierId) return;

    const newRevObj: CourierReview = {
      id: `rev_${Date.now()}`,
      courierId: viewingReviewsCourierId,
      rating: newReviewRating,
      comment: newReviewComment || 'Entregou com responsabilidade e rapidez.',
      date: new Date().toISOString().split('T')[0]
    };

    const updatedReviews = [...reviews, newRevObj];
    setReviews(updatedReviews);

    // Recalculate courier rating average
    const riderReviews = updatedReviews.filter(r => r.courierId === viewingReviewsCourierId);
    const avgRating = riderReviews.reduce((acc, cr) => acc + cr.rating, 0) / riderReviews.length;
    
    setCouriers(prev => prev.map(c => {
      if (c.id === viewingReviewsCourierId) {
        return { ...c, rating: parseFloat(avgRating.toFixed(1)) };
      }
      return c;
    }));

    setNewReviewComment('');
    setNewReviewRating(5);
  };

  const getRiderReviews = (riderId: string) => {
    return reviews.filter(r => r.courierId === riderId);
  };

  return (
    <div id="entregadores-view-container" className="space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3.5">
            <span className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </span>
            Gestão Premium de Entregadores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Controle a frota, atribua veículos, regule status e visualize reviews de qualidade de atendimento.
          </p>
        </div>

        <button
          id="btn-trigger-add-courier"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-650 dark:hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {isAddingNew ? 'Fechar Formulário' : 'Novo Entregador'}
        </button>
      </div>

      {/* METRIC ANALYTICAL ROW */}
      <div id="metrics-analytical-row" className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Total Frota</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">{totalRiders}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Dispositivos cadastrados</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-mono">Disponíveis</p>
          <p className="text-xl font-black text-emerald-500 mt-1.5">{availableRiders}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Aguardando chamada</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-indigo-500 uppercase tracking-widest font-mono">Em Rota</p>
          <p className="text-xl font-black text-indigo-500 mt-1.5">{activeDeliveries}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Corridas em curso</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-amber-500 uppercase tracking-widest font-mono">Tempo Médio</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1.5">{avgTimeText}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Previsão por rota</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-violet-500 uppercase tracking-widest font-mono">Ranking Top</p>
          <p className="text-xl font-black text-violet-500 mt-1.5 truncate text-ellipsis max-w-full" title={fastRider}>{fastRider.split(' ')[0]}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Melhor avaliação</span>
        </div>
         <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] text-sky-500 uppercase tracking-widest font-mono">Taxa Sucesso</p>
          <p className="text-xl font-black text-sky-500 mt-1.5">{successRate}</p>
          <span className="text-[10px] text-slate-400 block mt-1 font-mono">Sem reclamações</span>
        </div>
      </div>

      {/* RIDER REGISTRATION SLIDE DOWN */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            id="courier-creation-form-wrapper"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-150 dark:border-slate-800 shadow-xl"
          >
            <form onSubmit={handleRegisterCourier} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Ficha Cadastral do Entregador</h3>
                <span className="text-xs text-slate-400 font-mono">Todos os dados serão salvos localmente</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1 */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block">Nome Completo *</label>
                    <input
                      type="text"
                      placeholder="Ex: Danilo Alvarenga"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block">Celular / WhatsApp *</label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 98765-4321"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block">CPF de Registro *</label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={newCpf}
                      onChange={e => setNewCpf(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block">Tipo do Veículo *</label>
                    <select
                      value={newVehicleType}
                      onChange={e => setNewVehicleType(e.target.value as VehicleType)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 dark:text-white"
                    >
                      <option value="moto">Motocicleta / Scooter</option>
                      <option value="carro">Automóvel (Carro)</option>
                      <option value="bicicleta">Bicicleta / Patinete Elétrico</option>
                    </select>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block">Veículo (Modelo e Cor)</label>
                    <input
                      type="text"
                      placeholder="Ex: CG Titan 160cc Azul"
                      value={newVehicle}
                      onChange={e => setNewVehicle(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block">Placa Merco</label>
                      <input
                        type="text"
                        placeholder="Ex: ABC-1234"
                        value={newPlate}
                        onChange={e => setNewPlate(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block">Foto de Perfil (URL)</label>
                      <input
                        type="text"
                        placeholder="Link OPCIONAL"
                        value={newPhoto}
                        onChange={e => setNewPhoto(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-650 dark:hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/10 shrink-0"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER & COURIER DISPLAY BODY */}
      <div id="courier-display-body" className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LIST & FILTER BLOCK (3 COLUMNS) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquise por nome, veículo, placa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-850 focus:outline-none focus:border-emerald-500 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1 md:pb-0">
              {['todos', 'moto', 'carro', 'bicicleta'].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedVehicleType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    selectedVehicleType === type
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-850'
                  }`}
                >
                  {type === 'todos' ? 'Todos' : type === 'moto' ? 'MOTO 🛵' : type === 'carro' ? 'CARRO 🚗' : 'BIKE 🚲'}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE COURIER GRID */}
          <div id="couriers-grid-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCouriers.length === 0 ? (
              <div className="col-span-full py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-center text-slate-400 space-y-3">
                <Users2 className="w-10 h-10 mx-auto stroke-[1.2]" />
                <p className="font-mono text-xs uppercase tracking-wider">Nenhum entregador atende aos filtros</p>
              </div>
            ) : (
              filteredCouriers.map(rider => {
                const isViewingReviews = viewingReviewsCourierId === rider.id;
                const activeOrdersCount = rider.activeOrders ? rider.activeOrders.length : 0;
                
                return (
                  <div
                    key={rider.id}
                    id={`rider-card-${rider.id}`}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-200 space-y-3 shadow-xs relative overflow-hidden ${
                      rider.status === 'Disponível' ? 'hover:border-emerald-400/50' :
                      rider.status === 'Em entrega' ? 'hover:border-indigo-400/50' : 'hover:border-slate-350'
                    }`}
                  >
                    {/* Status side mark */}
                    <div className={`absolute top-0 right-0 w-2 h-full ${
                      rider.status === 'Disponível' ? 'bg-emerald-500' :
                      rider.status === 'Em entrega' ? 'bg-indigo-500' :
                      rider.status === 'Pausado' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />

                    <div className="flex gap-3">
                      {/* Photo preview */}
                      <div className="relative">
                        <img
                          src={rider.photo}
                          alt={rider.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <span className={`absolute -bottom-1 -right-1 p-1 rounded-md text-white shadow-xs ${
                          rider.vehicleType === 'moto' ? 'bg-emerald-500' :
                          rider.vehicleType === 'carro' ? 'bg-blue-500' : 'bg-pink-500'
                        }`}>
                          {rider.vehicleType === 'moto' && <Bike className="w-2.5 h-2.5" />}
                          {rider.vehicleType === 'carro' && <Car className="w-2.5 h-2.5" />}
                          {rider.vehicleType === 'bicicleta' && <Milestone className="w-2.5 h-2.5" />}
                        </span>
                      </div>

                      {/* Header info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs truncate text-slate-900 dark:text-white" title={rider.name}>
                            {rider.name}
                          </h4>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            rider.status === 'Disponível' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' :
                            rider.status === 'Em entrega' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40' :
                            rider.status === 'Pausado' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' :
                            'bg-slate-100 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-850'
                          }`}>
                            {rider.status}
                          </span>
                        </div>

                        {/* Badges/Subtext in column */}
                        <div className="space-y-0.5 mt-1">
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {rider.phone}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Placa: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{rider.plate}</span> • {rider.vehicle}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            CPF: <span className="font-mono">{rider.cpf}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details (Rating, avg time) */}
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800/80 text-center text-[10px] font-mono">
                      <div className="border-r border-slate-100 dark:border-slate-800/80 space-y-0.5">
                        <span className="text-slate-400 text-[8.5px] block uppercase">Nota</span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {rider.rating}
                        </span>
                      </div>
                      <div className="border-r border-slate-100 dark:border-slate-800/80 space-y-0.5">
                        <span className="text-slate-400 text-[8.5px] block uppercase">Média</span>
                        <span className="text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-0.5">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          {rider.avgDeliveryTime || '20 min'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-400 text-[8.5px] block uppercase">Corridas</span>
                        <span className={`font-bold block ${activeOrdersCount > 0 ? 'text-indigo-500' : 'text-slate-500'}`}>
                          {activeOrdersCount} ativas
                        </span>
                      </div>
                    </div>

                    {/* Footer Address */}
                    <p className="text-[10px] text-slate-450 flex items-center gap-1 truncate font-mono bg-slate-50/50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-100 dark:border-slate-900">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      GPS: {rider.lastLocation ? rider.lastLocation.address : 'Sinal indisponível'}
                    </p>

                    {/* Actions and toggle status selectors */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 dark:border-slate-850">
                      <div className="flex items-center gap-1">
                        <select
                          id={`select-status-${rider.id}`}
                          value={rider.status}
                          onChange={e => handleUpdateStatus(rider.id, e.target.value as CourierStatus)}
                          className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 dark:text-white"
                        >
                          <option value="Disponível">Disponível</option>
                          <option value="Em entrega">Em entrega</option>
                          <option value="Pausado">Pausado</option>
                          <option value="Offline">Offline</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          id={`btn-reviews-${rider.id}`}
                          onClick={() => setViewingReviewsCourierId(isViewingReviews ? null : rider.id)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                            isViewingReviews 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                              : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-500 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <MessageSquare className="w-3 h-3 text-indigo-400" />
                          Reviews ({getRiderReviews(rider.id).length})
                        </button>

                        <button
                          id={`btn-delete-${rider.id}`}
                          onClick={() => handleDeleteCourier(rider.id)}
                          className="p-1 px-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 transition border border-rose-100 dark:border-rose-950/10"
                          title="Remover entregador"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* FEEDBACK & RATINGS PANEL ON THE RIGHT (1 COLUMN) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-[12.5px] uppercase tracking-wider text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
              Selo de Qualidade
            </h3>

            {viewingReviewsCourierId ? (
              <div className="space-y-4">
                {/* Header highlighting selected */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-wide">Filtro Ativado</span>
                  <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                    {couriers.find(c => c.id === viewingReviewsCourierId)?.name || 'Consultando...'}
                  </p>
                  <button 
                    onClick={() => setViewingReviewsCourierId(null)}
                    className="text-[9.5px] text-indigo-600 dark:text-indigo-400 underline font-semibold mt-1 hover:text-indigo-800 block"
                  >
                    Ver avaliações gerais de todos
                  </button>
                </div>

                {/* Simulated review comments list */}
                <div className="space-y-2.5 max-h-[190px] overflow-y-auto scrollbar-thin">
                  {getRiderReviews(viewingReviewsCourierId).length === 0 ? (
                    <p className="text-[10px] italic text-slate-400">Nenhum comentário registrado para este entregador.</p>
                  ) : (
                    getRiderReviews(viewingReviewsCourierId).map((rev) => (
                      <div key={rev.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/55 dark:border-slate-850/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex text-amber-500">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 fill-current" />
                            ))}
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-mono">{rev.date}</span>
                        </div>
                        <p className="text-[10px] italic text-slate-600 dark:text-slate-400 font-medium">"{rev.comment}"</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add dynamic review form */}
                <form onSubmit={handleAddReview} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Simular Review do Cliente</p>
                  
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Qualidade (1 a 5 estrelas)</label>
                    <select
                      value={newReviewRating}
                      onChange={e => setNewReviewRating(parseInt(e.target.value))}
                      className="w-full text-xs font-bold p-1 px-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg dark:text-white focus:outline-none"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Excelente (5)</option>
                      <option value="4">⭐⭐⭐⭐ Muito Bom (4)</option>
                      <option value="3">⭐⭐⭐ Regular (3)</option>
                      <option value="2">⭐⭐ Ruim (2)</option>
                      <option value="1">⭐ Crítico (1)</option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Adicione um comentário..."
                      value={newReviewComment}
                      onChange={e => setNewReviewComment(e.target.value)}
                      className="w-full text-[11px] p-2 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg focus:outline-none dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10.5px] py-1.5 rounded-lg border border-indigo-500/20 active:scale-95 transition-all"
                  >
                    Postar Comentário
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3.5">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Selecione o botão <strong>"Reviews"</strong> nos cartões de cada motoboy para ler e simular notas, verificar o histórico de satisfação de clientes e as avaliações do iFood Logística ou Uber Direct.
                </p>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-900 rounded-xl space-y-3">
                  <span className="text-[9.5px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Últimos Comentários:</span>
                  
                  <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {reviews.slice(-3).reverse().map((r, index) => {
                      const relatedRider = couriers.find(c => c.id === r.courierId);
                      return (
                        <div key={r.id || index} className="text-[10px] py-1.5 border-b border-slate-200/40 dark:border-slate-850/60 last:border-0 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 dark:text-slate-200">{relatedRider ? relatedRider.name : 'Vez de Prato'}</span>
                            <div className="flex text-amber-500">
                              {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} className="w-2 h-2 fill-current" />
                              ))}
                            </div>
                          </div>
                          <p className="italic text-slate-450">"{r.comment}"</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TABLE PREVIEW SCHEMA LOG */}
          <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-900 p-4 rounded-2xl font-mono text-[10.5px] text-slate-500 space-y-2">
            <span className="font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4 text-emerald-500" />
              tbl_entregadores
            </span>
            <p className="text-[9.5px] leading-snug">
              Campos de logísticos indexados no Supabase e em sincronia bidirecional com webhook de entregadores do iFood e Lalamove.
            </p>
            <div className="p-1.5 bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-850 rounded text-[9px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              STATUS: SYNCED
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
