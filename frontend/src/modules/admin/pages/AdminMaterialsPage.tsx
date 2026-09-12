import React, { useEffect, useState } from 'react';
import { Download, Plus, Edit2, Trash2, ExternalLink, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';
import { PromotionalMaterial } from '../../../types';
import { adminService } from '../../../services/api/admin.service';
import { useUIStore } from '../../../store/useUIStore';

export const AdminMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<PromotionalMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromotionalMaterial | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'banner' | 'guide' | 'pricing_template' | 'logo' | 'story'>('banner');
  const [fileUrl, setFileUrl] = useState('');
  const [format, setFormat] = useState('ZIP');
  const [fileSizeMb, setFileSizeMb] = useState<number>(1.5);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  const { showToast } = useUIStore();

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getPromotionalMaterials();
      setMaterials(data || []);
    } catch (err) {
      console.error('Error cargando materiales:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setDescription('');
    setCategory('banner');
    setFileUrl('');
    setFormat('ZIP');
    setFileSizeMb(2.5);
    setIsActive(true);
    setSortOrder(materials.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PromotionalMaterial) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setFileUrl(item.file_url);
    setFormat(item.format);
    setFileSizeMb(item.file_size_mb);
    setIsActive(item.is_active);
    setSortOrder(item.sort_order);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        title,
        description,
        category,
        file_url: fileUrl,
        format,
        file_size_mb: Number(fileSizeMb),
        is_active: isActive,
        sort_order: Number(sortOrder),
      };

      if (editingItem) {
        await adminService.updatePromotionalMaterial(editingItem.id, payload);
        showToast('Material promocional actualizado con éxito', 'success');
      } else {
        await adminService.createPromotionalMaterial(payload);
        showToast('Nuevo material publicado para los clientes', 'success');
      }
      setIsModalOpen(false);
      loadMaterials();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar material', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el material "${title}"?`)) return;
    try {
      await adminService.deletePromotionalMaterial(id);
      showToast('Material eliminado correctamente', 'success');
      loadMaterials();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar material', 'error');
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'banner':
        return <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase">Banner</span>;
      case 'guide':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Guía PDF</span>;
      case 'pricing_template':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">Plantilla PVP</span>;
      case 'story':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase">Historias / RRSS</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">General</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Rajdhani'] uppercase tracking-wider flex items-center gap-2">
            <Download className="w-7 h-7 text-cyan-400" />
            Materiales Gastables & Descargas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestiona los recursos, guías, banners y plantillas que visualizan y descargan los clientes revendedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMaterials}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Material
          </button>
        </div>
      </div>

      {/* Materials List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4">Recurso / Título</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Formato / Peso</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Cargando recursos descargables...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No hay materiales registrados aún. Haz clic en "Nuevo Material" para agregar uno.
                  </td>
                </tr>
              ) : (
                materials.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs uppercase shrink-0">
                          {item.format}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{item.title}</span>
                          <span className="text-xs text-slate-400 line-clamp-1">{item.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {getCategoryBadge(item.category)}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-300">
                      {item.format} • {item.file_size_mb} MB
                    </td>
                    <td className="p-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Oculto
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Probar enlace de descarga"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => openEditModal(item)}
                          title="Editar material"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          title="Eliminar material"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {editingItem ? 'Editar Recurso Promocional' : 'Publicar Nuevo Recurso'}
                </h2>
                <p className="text-xs text-slate-400">
                  Visible en la sección Descargas para todos los socios revendedores.
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título del Recurso</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Pack Banners Redes Sociales Free Fire"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descripción</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve explicación de cómo usar el recurso..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="banner">Banner Publicitario</option>
                    <option value="guide">Guía de Revendedor (PDF)</option>
                    <option value="pricing_template">Plantilla Precios PVP</option>
                    <option value="story">Historias Instagram / WhatsApp</option>
                    <option value="logo">Logotipo Oficial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Formato de Archivo</label>
                  <input
                    type="text"
                    required
                    value={format}
                    onChange={(e) => setFormat(e.target.value.toUpperCase())}
                    placeholder="ZIP, PDF, XLSX, PNG"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tamaño Estimado (MB)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={fileSizeMb}
                    onChange={(e) => setFileSizeMb(parseFloat(e.target.value) || 0.1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Orden de Presentación</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">URL de Descarga Directa</label>
                <input
                  type="url"
                  required
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://servidor-descargas.com/recursos/kit.zip"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
                />
                <span className="text-xs text-slate-300 font-medium">Activo y disponible para descarga de clientes</span>
              </label>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : editingItem ? 'Actualizar' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

