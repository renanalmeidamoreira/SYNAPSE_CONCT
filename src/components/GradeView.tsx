import React, { useState } from 'react';
import { CourseData, MaterialItem, MaterialType, DisciplineItem } from '../types';
import { extractEmbedUrl } from '../utils/media';
import {
  Video,
  FileText,
  Link2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Play,
  BookOpen,
  Sparkles,
  Search,
  ExternalLink,
  Layers,
  X,
  FolderPlus,
  Edit2,
  Save,
  Check,
  AlertTriangle,
  Palette,
  Folder,
} from 'lucide-react';

interface GradeViewProps {
  course: CourseData;
  onUpdateCourse: (updated: CourseData) => void;
  onOpenMedia: (item: MaterialItem) => void;
  globalSearchQuery?: string;
}

const COLOR_OPTIONS = [
  { id: 'indigo', name: 'Índigo', bg: 'bg-indigo-500', badge: 'bg-indigo-950/80 text-indigo-400 border-indigo-800' },
  { id: 'emerald', name: 'Esmeralda', bg: 'bg-emerald-500', badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-800' },
  { id: 'cyan', name: 'Ciano', bg: 'bg-cyan-500', badge: 'bg-cyan-950/80 text-cyan-400 border-cyan-800' },
  { id: 'amber', name: 'Âmbar', bg: 'bg-amber-500', badge: 'bg-amber-950/80 text-amber-400 border-amber-800' },
  { id: 'rose', name: 'Rosa', bg: 'bg-rose-500', badge: 'bg-rose-950/80 text-rose-400 border-rose-800' },
  { id: 'purple', name: 'Roxo', bg: 'bg-purple-500', badge: 'bg-purple-950/80 text-purple-400 border-purple-800' },
  { id: 'blue', name: 'Azul', bg: 'bg-blue-500', badge: 'bg-blue-950/80 text-blue-400 border-blue-800' },
  { id: 'slate', name: 'Cinza', bg: 'bg-slate-500', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
];

export function getDisciplineBadgeClass(color?: string) {
  const found = COLOR_OPTIONS.find((c) => c.id === color);
  return found ? found.badge : COLOR_OPTIONS[0].badge;
}

export const GradeView: React.FC<GradeViewProps> = ({
  course,
  onUpdateCourse,
  onOpenMedia,
  globalSearchQuery,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'blocks' | 'grid'>('blocks');

  // Modal Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageDisciplinesModal, setShowManageDisciplinesModal] = useState(false);

  // Add Material Form State
  const [matType, setMatType] = useState<MaterialType>('link');
  const [matTitle, setMatTitle] = useState('');
  const [matCategory, setMatCategory] = useState<string>('');
  const [matUrl, setMatUrl] = useState('');
  const [matFocusEntry, setMatFocusEntry] = useState('');
  const [matPartnerId, setMatPartnerId] = useState('2608811');
  const [matTextData, setMatTextData] = useState('');

  // Inline New Discipline in Add Modal
  const [isCreatingInlineDiscipline, setIsCreatingInlineDiscipline] = useState(false);
  const [inlineDiscName, setInlineDiscName] = useState('');
  const [inlineDiscColor, setInlineDiscColor] = useState('indigo');

  // Manage Disciplines State
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscColor, setNewDiscColor] = useState('indigo');
  const [editingDiscId, setEditingDiscId] = useState<string | null>(null);
  const [editDiscName, setEditDiscName] = useState('');
  const [editDiscColor, setEditDiscColor] = useState('indigo');

  // Delete Confirmation Modal State
  const [deletingDisc, setDeletingDisc] = useState<DisciplineItem | null>(null);

  const materials = course.materials || [];

  // Consolidate list of disciplines for this station
  const getDisciplinesList = (): DisciplineItem[] => {
    const list: DisciplineItem[] = [...(course.disciplines || [])];

    // Ensure default 'Sem disciplina' exists
    if (!list.some((d) => d.name.toLowerCase() === 'sem disciplina')) {
      list.unshift({ id: 'disc-sem', name: 'Sem disciplina', color: 'slate' });
    }

    // Add any category from materials that isn't in disciplines list yet
    materials.forEach((m) => {
      const catName = m.category?.trim() || 'Sem disciplina';
      if (!list.some((d) => d.name.toLowerCase() === catName.toLowerCase())) {
        list.push({
          id: `disc-ext-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: catName,
          color: 'indigo',
        });
      }
    });

    return list;
  };

  const currentDisciplines = getDisciplinesList();

  // Initialize selected discipline when opening Add Modal
  const openAddModalWithDefaults = () => {
    setMatTitle('');
    setMatCategory(currentDisciplines[0]?.name || 'Sem disciplina');
    setMatUrl('');
    setMatFocusEntry('');
    setMatTextData('');
    setIsCreatingInlineDiscipline(false);
    setInlineDiscName('');
    setInlineDiscColor('indigo');
    setShowAddModal(true);
  };

  // Toggle Completed
  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMaterials = materials.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m
    );

    const completedCount = updatedMaterials.filter((m) => m.completed).length;
    const progress =
      updatedMaterials.length > 0
        ? Math.round((completedCount / updatedMaterials.length) * 100)
        : 0;

    onUpdateCourse({
      ...course,
      materials: updatedMaterials,
      progress,
    });
  };

  // Delete Material
  const handleDeleteMaterial = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMaterials = materials.filter((m) => m.id !== id);
    const completedCount = updatedMaterials.filter((m) => m.completed).length;
    const progress =
      updatedMaterials.length > 0
        ? Math.round((completedCount / updatedMaterials.length) * 100)
        : 0;

    onUpdateCourse({
      ...course,
      materials: updatedMaterials,
      progress,
    });
  };

  // Move Material to another Discipline
  const handleMoveCategory = (id: string, newCat: string) => {
    if (newCat === '__NEW__') {
      setShowManageDisciplinesModal(true);
      return;
    }
    const updatedMaterials = materials.map((m) =>
      m.id === id ? { ...m, category: newCat } : m
    );
    onUpdateCourse({
      ...course,
      materials: updatedMaterials,
    });
  };

  // Create Discipline Handler
  const handleCreateDiscipline = (name: string, color: string): DisciplineItem => {
    const trimmed = name.trim();
    if (!trimmed) return { id: '', name: '', color: 'indigo' };

    const newDisc: DisciplineItem = {
      id: `disc-${Date.now()}`,
      name: trimmed,
      color: color || 'indigo',
    };

    const existingDiscs = course.disciplines || [];
    const updatedDiscs = [...existingDiscs, newDisc];

    onUpdateCourse({
      ...course,
      disciplines: updatedDiscs,
    });

    return newDisc;
  };

  // Confirm Inline Discipline Creation in Add Modal
  const handleConfirmInlineDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineDiscName.trim()) return;

    const created = handleCreateDiscipline(inlineDiscName.trim(), inlineDiscColor);
    setMatCategory(created.name);
    setIsCreatingInlineDiscipline(false);
    setInlineDiscName('');
  };

  // Add Material Submission
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;

    let finalCategory = matCategory.trim();
    if (isCreatingInlineDiscipline && inlineDiscName.trim()) {
      const created = handleCreateDiscipline(inlineDiscName.trim(), inlineDiscColor);
      finalCategory = created.name;
    }

    if (!finalCategory) {
      finalCategory = 'Sem disciplina';
    }

    let finalEntryId = matFocusEntry.trim();
    let finalUrl = matUrl.trim();

    if (matType === 'focus' && finalEntryId) {
      const extractedEmbed = extractEmbedUrl(finalEntryId, matPartnerId);
      if (extractedEmbed && extractedEmbed.includes('entry_id=')) {
        const match = extractedEmbed.match(/entry_id=([^/&]+)/);
        if (match && match[1]) {
          finalEntryId = match[1];
        }
      }
      if (!finalUrl) {
        finalUrl = matFocusEntry.trim();
      }
    }

    const newMaterial: MaterialItem = {
      id: `mat-${Date.now()}`,
      title: matTitle.trim(),
      type: matType,
      category: finalCategory,
      url: finalUrl || undefined,
      entryId: finalEntryId || undefined,
      partnerId: matPartnerId.trim() || '2608811',
      data: matType === 'text' ? matTextData.trim() : undefined,
      completed: false,
      createdAt: Date.now(),
    };

    const updatedMaterials = [newMaterial, ...materials];
    const completedCount = updatedMaterials.filter((m) => m.completed).length;
    const progress = Math.round((completedCount / updatedMaterials.length) * 100);

    onUpdateCourse({
      ...course,
      materials: updatedMaterials,
      progress,
    });

    setShowAddModal(false);
  };

  // Edit Discipline Name/Color
  const handleStartEditDiscipline = (disc: DisciplineItem) => {
    setEditingDiscId(disc.id);
    setEditDiscName(disc.name);
    setEditDiscColor(disc.color || 'indigo');
  };

  const handleSaveEditDiscipline = (discId: string, oldName: string) => {
    const trimmed = editDiscName.trim();
    if (!trimmed) return;

    const existingDiscs = currentDisciplines;
    const updatedDiscs = existingDiscs.map((d) =>
      d.id === discId ? { ...d, name: trimmed, color: editDiscColor } : d
    );

    // Update category name in linked materials if renamed
    let updatedMaterials = materials;
    if (oldName !== trimmed) {
      updatedMaterials = materials.map((m) =>
        (m.category || 'Sem disciplina').toLowerCase() === oldName.toLowerCase()
          ? { ...m, category: trimmed }
          : m
      );
    }

    onUpdateCourse({
      ...course,
      disciplines: updatedDiscs,
      materials: updatedMaterials,
    });

    setEditingDiscId(null);
  };

  // Delete Discipline Logic
  const handleTriggerDeleteDiscipline = (disc: DisciplineItem) => {
    if (disc.name.toLowerCase() === 'sem disciplina') {
      alert('A categoria "Sem disciplina" é padrão e não pode ser excluída.');
      return;
    }
    setDeletingDisc(disc);
  };

  const handleConfirmDeleteDiscipline = (moveToDefault: boolean) => {
    if (!deletingDisc) return;

    const discName = deletingDisc.name;

    // Move materials to "Sem disciplina"
    const updatedMaterials = materials.map((m) =>
      (m.category || 'Sem disciplina').toLowerCase() === discName.toLowerCase()
        ? { ...m, category: 'Sem disciplina' }
        : m
    );

    const updatedDiscs = (course.disciplines || []).filter(
      (d) => d.name.toLowerCase() !== discName.toLowerCase()
    );

    onUpdateCourse({
      ...course,
      disciplines: updatedDiscs,
      materials: updatedMaterials,
    });

    setDeletingDisc(null);
  };

  // Filtering materials
  const activeSearch = globalSearchQuery || searchQuery;
  const filteredMaterials = materials.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (
      activeSearch.trim() &&
      !item.title.toLowerCase().includes(activeSearch.toLowerCase()) &&
      !(item.category && item.category.toLowerCase().includes(activeSearch.toLowerCase())) &&
      !(item.data && item.data.toLowerCase().includes(activeSearch.toLowerCase()))
    ) {
      return false;
    }
    return true;
  });

  // Group materials by category/block
  const materialsByBlock: Record<string, MaterialItem[]> = {};
  filteredMaterials.forEach((item) => {
    const cat = item.category?.trim() || 'Sem disciplina';
    if (!materialsByBlock[cat]) {
      materialsByBlock[cat] = [];
    }
    materialsByBlock[cat].push(item);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search, Filter & Block Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar mídias ou blocos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Todas as Mídias</option>
            <option value="link">Vídeos & Links (YouTube/Web)</option>
            <option value="focus">Focus LMS (Kaltura Video)</option>
            <option value="text">Leitura (Textos & Resumos)</option>
            <option value="notebooklm">NotebookLM IA</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode('blocks')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'blocks'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
              }`}
            >
              Blocos
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
              }`}
            >
              Grade
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageDisciplinesModal(true)}
            className="flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all"
            title="Gerenciar, editar e excluir disciplinas desta estação"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            <span>Gerenciar Disciplinas</span>
          </button>
          <button
            onClick={openAddModalWithDefaults}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Material</span>
          </button>
        </div>
      </div>

      {/* Content Display */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Nenhum material encontrado</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Cadastre videoaulas do Focus LMS, links do YouTube ou resumos para estruturar os blocos desta estação.
          </p>
          <button
            onClick={openAddModalWithDefaults}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
          >
            Cadastrar Material Agora
          </button>
        </div>
      ) : viewMode === 'blocks' ? (
        /* Block-based View (Grouped by Disciplina) */
        <div className="space-y-6">
          {Object.entries(materialsByBlock).map(([blockName, blockItems]) => {
            const completedBlock = blockItems.filter((i) => i.completed).length;
            const blockProgress = Math.round((completedBlock / blockItems.length) * 100);
            const discMeta = currentDisciplines.find(
              (d) => d.name.toLowerCase() === blockName.toLowerCase()
            );
            const badgeClass = getDisciplineBadgeClass(discMeta?.color);

            return (
              <div
                key={blockName}
                className="bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4"
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white tracking-tight">
                          {blockName}
                        </h3>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {blockItems.length} {blockItems.length === 1 ? 'material' : 'materiais'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {completedBlock} de {blockItems.length} concluídos ({blockProgress}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-36">
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${blockProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Items in this Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blockItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onOpenMedia(item)}
                      className={`group relative bg-slate-50 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800/80 border ${
                        item.completed ? 'border-emerald-900/40 opacity-80' : 'border-slate-200 dark:border-slate-800/80'
                      } rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-extrabold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-full uppercase font-mono">
                            {item.type}
                          </span>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Change Category Select */}
                            <select
                              value={item.category || 'Sem disciplina'}
                              onChange={(e) => handleMoveCategory(item.id, e.target.value)}
                              className="bg-slate-100 dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 max-w-[140px] truncate"
                              title="Mover para outra disciplina"
                            >
                              {currentDisciplines.map((d) => (
                                <option key={d.id} value={d.name}>
                                  Mover p/ {d.name}
                                </option>
                              ))}
                              <option value="__NEW__">+ Gerenciar Disciplinas...</option>
                            </select>

                            <button
                              type="button"
                              onClick={(e) => handleToggleComplete(item.id, e)}
                              className="p-1 text-slate-500 hover:text-emerald-400 transition-colors ml-1"
                              title={item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                            >
                              {item.completed ? (
                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-400" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteMaterial(item.id, e)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Excluir material"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h4
                          className={`text-sm font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2 ${
                            item.completed ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/60 mt-2 text-xs">
                        <span className="text-slate-500 text-[11px]">
                          {item.type === 'text' ? 'Documento / Resumo' : 'Player Acoplado'}
                        </span>
                        <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          <span>{item.type === 'text' ? 'Ler' : 'Assistir'}</span>
                          <Play className="w-3 h-3 fill-current" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaterials.map((item) => {
            const discMeta = currentDisciplines.find(
              (d) => d.name.toLowerCase() === (item.category || 'Sem disciplina').toLowerCase()
            );
            const badgeClass = getDisciplineBadgeClass(discMeta?.color);

            return (
              <div
                key={item.id}
                onClick={() => onOpenMedia(item)}
                className={`group relative bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/80 border ${
                  item.completed ? 'border-emerald-900/40 opacity-80' : 'border-slate-200 dark:border-slate-800'
                } rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${badgeClass}`}>
                        {item.category || 'Sem disciplina'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase font-mono">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(item.id, e)}
                        className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        {item.completed ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMaterial(item.id, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4
                    className={`text-sm font-bold text-slate-800 dark:text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2 ${
                      item.completed ? 'line-through text-slate-500' : ''
                    }`}
                  >
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/60 mt-2 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {item.type === 'text' ? 'Documento de Texto' : 'Player / Embed Acoplado'}
                  </span>
                  <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>{item.type === 'text' ? 'Ler' : 'Assistir'}</span>
                    <Play className="w-3 h-3 fill-current" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MANAGE DISCIPLINES MODAL */}
      {showManageDisciplinesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gerenciar Disciplinas da Estação</h3>
                  <p className="text-xs text-slate-400">Crie, edite ou altere as cores das disciplinas do curso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageDisciplinesModal(false);
                  setEditingDiscId(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add New Discipline Form */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 shrink-0">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Criar Nova Disciplina</span>
              </h4>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Nome da disciplina (ex: Direito Administrativo)"
                  value={newDiscName}
                  onChange={(e) => setNewDiscName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-700 shrink-0">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewDiscColor(c.id)}
                      className={`w-5 h-5 rounded-full ${c.bg} transition-all ${
                        newDiscColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (newDiscName.trim()) {
                      handleCreateDiscipline(newDiscName.trim(), newDiscColor);
                      setNewDiscName('');
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* List of Existing Disciplines */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Disciplinas Cadastradas ({currentDisciplines.length})
              </span>

              {currentDisciplines.map((disc) => {
                const isEditing = editingDiscId === disc.id;
                const linkedCount = materials.filter(
                  (m) => (m.category || 'Sem disciplina').toLowerCase() === disc.name.toLowerCase()
                ).length;
                const isDefaultSem = disc.name.toLowerCase() === 'sem disciplina';
                const badgeClass = getDisciplineBadgeClass(disc.color);

                if (isEditing) {
                  return (
                    <div
                      key={disc.id}
                      className="p-3 bg-indigo-950/40 border border-indigo-700/60 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in"
                    >
                      <input
                        type="text"
                        value={editDiscName}
                        onChange={(e) => setEditDiscName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEditDiscColor(c.id)}
                            className={`w-4 h-4 rounded-full ${c.bg} transition-all ${
                              editDiscColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveEditDiscipline(disc.id, disc.name)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 px-3"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDiscId(null)}
                          className="text-slate-400 hover:text-white px-2 py-1 text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={disc.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeClass} shrink-0`}>
                        {disc.name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {linkedCount} {linkedCount === 1 ? 'material vinculado' : 'materiais vinculados'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditDiscipline(disc)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar nome ou cor da disciplina"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {!isDefaultSem && (
                        <button
                          type="button"
                          onClick={() => handleTriggerDeleteDiscipline(disc)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Excluir disciplina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowManageDisciplinesModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-2.5 rounded-xl"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE DISCIPLINE CONFIRMATION MODAL */}
      {deletingDisc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">Excluir Disciplina</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a excluir a disciplina <strong className="text-white">"{deletingDisc.name}"</strong>.
            </p>

            {(() => {
              const count = materials.filter(
                (m) => (m.category || 'Sem disciplina').toLowerCase() === deletingDisc.name.toLowerCase()
              ).length;

              if (count > 0) {
                return (
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs space-y-2">
                    <p className="text-slate-200 font-semibold">
                      Esta disciplina possui <span className="text-cyan-400 font-bold">{count} material(is) vinculado(s)</span>.
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Nenhum material será excluído. Ao prosseguir, os materiais serão movidos para a categoria padrão <strong className="text-slate-300">"Sem disciplina"</strong>.
                    </p>
                  </div>
                );
              }

              return (
                <p className="text-xs text-slate-400">
                  Esta disciplina não possui materiais vinculados.
                </p>
              );
            })()}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDeleteDiscipline(true)}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all"
              >
                Mover materiais para "Sem disciplina" e Excluir
              </button>
              <button
                type="button"
                onClick={() => setDeletingDisc(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MATERIAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Cadastrar Material / Mídia</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Mídia *
                  </label>
                  <select
                    value={matType}
                    onChange={(e) => setMatType(e.target.value as MaterialType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="link">Vídeo / Link Web (YouTube)</option>
                    <option value="focus">Focus LMS (Kaltura Video)</option>
                    <option value="text">Texto / Resumo</option>
                    <option value="notebooklm">NotebookLM IA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Disciplina *
                  </label>
                  {!isCreatingInlineDiscipline ? (
                    <select
                      value={matCategory}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingInlineDiscipline(true);
                        } else {
                          setMatCategory(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {currentDisciplines.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                      <option value="__NEW__">+ Nova disciplina...</option>
                    </select>
                  ) : (
                    <div className="space-y-2 p-3 bg-slate-950 border border-indigo-700/60 rounded-2xl animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400">
                        <span>Nova Disciplina</span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingInlineDiscipline(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Nome da disciplina"
                        value={inlineDiscName}
                        onChange={(e) => setInlineDiscName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          {COLOR_OPTIONS.slice(0, 5).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setInlineDiscColor(c.id)}
                              className={`w-4 h-4 rounded-full ${c.bg} ${
                                inlineDiscColor === c.id ? 'ring-2 ring-white' : 'opacity-60'
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmInlineDiscipline}
                          className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg"
                        >
                          Criar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Videoaula - Crimes Contra a Administração"
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {matType === 'focus' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Entry ID do Kaltura (ou URL do Vídeo) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1_abc12345 ou URL completa do Focus"
                      value={matFocusEntry}
                      onChange={(e) => setMatFocusEntry(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Partner ID Kaltura (Padrão: 2608811)
                    </label>
                    <input
                      type="text"
                      value={matPartnerId}
                      onChange={(e) => setMatPartnerId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </>
              ) : matType === 'text' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Conteúdo do Texto / Resumo *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Cole ou digite aqui seu texto ou resumo de aula..."
                    value={matTextData}
                    onChange={(e) => setMatTextData(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL / Link Web *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                    value={matUrl}
                    onChange={(e) => setMatUrl(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
