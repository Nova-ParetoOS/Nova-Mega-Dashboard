import React, { useState, useEffect } from 'react';
import { Settings, Shield, Store, Mail, Trash2, Edit2, Plus, X, AlertTriangle } from 'lucide-react';

export const Configuracoes = ({ userRole, STORE_CONFIGS, getSystemProfiles, saveSystemProfile, deleteSystemProfile }) => {
  if (userRole !== 'owner') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500 p-10 bg-gray-50">
        <AlertTriangle className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-black mb-2">Acesso Negado</h2>
        <p className="text-gray-600 font-medium">Esta área é restrita a administradores do ecossistema.</p>
      </div>
    );
  }

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const [form, setForm] = useState({
    email: '',
    role: 'gerente',
    store_id: '10'
  });

  const loadProfiles = async () => {
    setLoading(true);
    const data = await getSystemProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const openNew = () => {
    setEditData(null);
    setForm({ email: '', role: 'gerente', store_id: Object.keys(STORE_CONFIGS)[0] || '10' });
    setModalOpen(true);
  };

  const openEdit = (profile) => {
    setEditData(profile);
    setForm({
      email: profile.email,
      role: profile.role || 'gerente',
      store_id: profile.store_id || Object.keys(STORE_CONFIGS)[0] || '10'
    });
    setModalOpen(true);
  };

  const handeSave = async () => {
    if (!form.email) return alert('E-mail é obrigatório!');
    const payload = { ...form };
    if (editData) payload.id = editData.id;
    
    const res = await saveSystemProfile(payload);
    if (!res.success) {
      alert(`Falha ao salvar: ${res.error}`);
    } else {
      setModalOpen(false);
      loadProfiles();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja revogar este acesso permanentemente?')) return;
    const ok = await deleteSystemProfile(id);
    if (ok) loadProfiles();
  };

  return (
    <div className="h-full p-6 md:p-8 overflow-y-auto bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Settings className="text-indigo-600" />
              Painel de Controle <span className="text-indigo-600">Multi-Tenant</span>
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Gerencie a hierarquia de acesso (RBAC) e as permissões ativas do SaaS.
            </p>
          </div>
          <button 
            onClick={openNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Acesso
          </button>
        </div>

        {/* Tabela de Perfis */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-black tracking-widest text-gray-500">
                <th className="p-4">E-mail</th>
                <th className="p-4">Cargo / Role</th>
                <th className="p-4">Loja (Branch)</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400 font-bold animate-pulse">Carregando usuários...</td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-10 text-center text-gray-400 font-bold">Nenhum usuário cadastrado.</td>
                </tr>
              ) : (
                profiles.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {p.email}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                        p.role === 'owner' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        <Shield className="w-3.5 h-3.5" />
                        {p.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {p.role === 'owner' ? (
                        <span className="text-xs font-bold text-gray-400 italic flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" /> Todas as Lojas
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                          <Store className="w-4 h-4 text-teal-600" />
                          {STORE_CONFIGS[p.store_id]?.name || `Loja ${p.store_id}`}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEdit(p)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors inline-block text-center">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors inline-block text-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-xl">{editData ? 'Editar Acesso' : 'Novo Acesso'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-indigo-100 text-sm font-medium">Defina as credenciais e permissões no sistema.</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" placeholder="nome@empresa.com" 
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    disabled={!!editData}
                    className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none transition-colors disabled:opacity-50" />
                </div>
                {editData && <p className="text-[10px] text-gray-400 mt-1">O e-mail não pode ser alterado após cadastrado.</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Nível de Acesso (Cargo)</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none transition-colors appearance-none">
                  <option value="gerente">Gerente (Acesso Filial)</option>
                  <option value="vendedora">Vendedora (Acesso Restrito)</option>
                </select>
              </div>

              {form.role === 'gerente' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Loja Associada</label>
                  <select value={form.store_id} onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none transition-colors appearance-none">
                    {Object.entries(STORE_CONFIGS).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button onClick={handeSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 transition-all">
                  {editData ? 'Salvar Alterações' : 'Cadastrar Perfil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
