import React, { useState } from 'react';
import { Flashcard } from '../types';
import { callGeminiAPI } from '../utils/gemini';
import {
  Layers,
  Sparkles,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Filter,
  Search,
  Eye,
  EyeOff,
  Grid,
  Maximize2,
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  onUpdateFlashcards: (cards: Flashcard[]) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  onUpdateFlashcards,
}) => {
  // View mode: 'multi-grid' or 'slideshow'
  const [viewMode, setViewMode] = useState<'multi-grid' | 'slideshow'>('multi-grid');

  // Multi-card state: Set of flipped card IDs
  const [flippedCardIds, setFlippedCardIds] = useState<Set<string>>(new Set());

  // Search & Filter
  const [selectedMateria, setSelectedMateria] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Single card slideshow index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Manual Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [frente, setFrente] = useState('');
  const [verso, setVerso] = useState('');
  const [materia, setMateria] = useState('');

  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('Direito Penal / Crimes Públicos');
  const [aiNumCards, setAiNumCards] = useState(5);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Extract unique subjects
  const materias = Array.from(
    new Set(flashcards.map((c) => c.materia || 'Geral').filter(Boolean))
  );

  // Filtered Cards
  const filteredCards = flashcards.filter((card) => {
    if (selectedMateria !== 'all' && (card.materia || 'Geral') !== selectedMateria) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFrente = card.frente.toLowerCase().includes(q);
      const matchVerso = card.verso.toLowerCase().includes(q);
      const matchMat = (card.materia || '').toLowerCase().includes(q);
      if (!matchFrente && !matchVerso && !matchMat) return false;
    }
    return true;
  });

  // Toggle single card flip in multi-card grid
  const handleToggleFlip = (id: string) => {
    setFlippedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Flip all or Unflip all
  const handleFlipAll = () => {
    if (flippedCardIds.size === filteredCards.length && filteredCards.length > 0) {
      setFlippedCardIds(new Set());
    } else {
      const allIds = new Set(filteredCards.map((c) => c.id));
      setFlippedCardIds(allIds);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frente.trim() || !verso.trim()) return;

    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      frente: frente.trim(),
      verso: verso.trim(),
      materia: materia.trim() || 'Geral',
      createdAt: Date.now(),
    };

    onUpdateFlashcards([newCard, ...flashcards]);
    setFrente('');
    setVerso('');
    setMateria('');
    setShowAddModal(false);
  };

  const handleDeleteCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = flashcards.filter((c) => c.id !== id);
    onUpdateFlashcards(updated);

    // Remove from flipped state
    setFlippedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (currentIndex >= updated.length && updated.length > 0) {
      setCurrentIndex(updated.length - 1);
    }
  };

  const handleGenerateAiCards = async () => {
    setLoadingAi(true);
    setAiError('');

    try {
      const prompt = `Gere ${aiNumCards} flashcards de memorização em formato de pergunta (frente) e resposta explicativa objetiva (verso) sobre o tema: "${aiTopic}" para concursos públicos.

Retorne ESTRITAMENTE em formato JSON com o seguinte schema:
[
  { "frente": "Pergunta ou conceito", "verso": "Explicação objetiva com fundamentação" }
]`;

      const result = await callGeminiAPI(
        prompt,
        'Você é um especialista em técnicas de repetição espaçada e memorização para concursos. Responda apenas com JSON válido.'
      );

      const jsonStart = result.indexOf('[');
      const jsonEnd = result.lastIndexOf(']');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = result.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const newCards: Flashcard[] = parsed.map((item: any, idx: number) => ({
            id: `ai-fc-${Date.now()}-${idx}`,
            frente: String(item.frente || 'Pergunta'),
            verso: String(item.verso || 'Resposta'),
            materia: aiTopic,
            createdAt: Date.now(),
          }));

          onUpdateFlashcards([...newCards, ...flashcards]);
          setShowAiModal(false);
          setCurrentIndex(0);
        }
      } else {
        throw new Error('Não foi possível processar o retorno dos flashcards.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Erro ao gerar flashcards com IA.');
    } finally {
      setLoadingAi(false);
    }
  };

  const currentSlideshowCard = filteredCards[currentIndex] || filteredCards[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header Bar & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Central Multi-Card de Flashcards ({filteredCards.length})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Visualize múltiplos cartões simultaneamente, vire individualmente e revise por matéria
          </p>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode('multi-grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'multi-grid'
                  ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grade Multi-Card</span>
            </button>
            <button
              onClick={() => setViewMode('slideshow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'slideshow'
                  ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Modo Foco (1x1)</span>
            </button>
          </div>

          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-slate-800 dark:text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Gerar com IA</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Card</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar pergunta ou termo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-500 pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            />
          </div>

          {/* Matéria Filter */}
          <div className="relative">
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-semibold px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Todas as Matérias ({flashcards.length})</option>
              {materias.map((mat) => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Flip All Toggle in Multi-Grid Mode */}
        {viewMode === 'multi-grid' && filteredCards.length > 0 && (
          <button
            onClick={handleFlipAll}
            className="flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-indigo-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700/80 transition-all"
          >
            {flippedCardIds.size === filteredCards.length ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Desvirar Todos os Cards</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Virar Todos ({filteredCards.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Content Rendering */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-20 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <Layers className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-slate-800 dark:text-slate-800 dark:text-white mb-2">Nenhum card cadastrado</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Não há flashcards criados ainda. Crie novos manualmente ou deixe a IA do Gemini gerar para você.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold px-6 py-3 rounded-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Manualmente</span>
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Gerar com IA</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'multi-grid' ? (
        /* Multi-Card Interactive Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card, idx) => {
            const isCardFlipped = flippedCardIds.has(card.id);

            return (
              <div
                key={card.id}
                onClick={() => handleToggleFlip(card.id)}
                className={`cursor-pointer min-h-[260px] bg-gradient-to-b ${
                  isCardFlipped
                    ? 'from-indigo-950 via-slate-900 to-slate-950 border-indigo-500/70 shadow-indigo-950/50'
                    : 'from-slate-900 via-slate-900 to-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
                } border rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all duration-300 relative group hover:scale-[1.01]`}
              >
                {/* Card Top */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-300 bg-indigo-950/90 border border-indigo-800/80 px-2.5 py-0.5 rounded-full uppercase truncate max-w-[180px]">
                    {card.materia || 'Geral'}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">#{idx + 1}</span>
                    <button
                      onClick={(e) => handleDeleteCard(card.id, e)}
                      className="p-1 text-slate-500 dark:text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                      title="Excluir card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Center Content */}
                <div className="my-auto py-4 space-y-2">
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-widest block ${
                      isCardFlipped ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'
                    }`}
                  >
                    {isCardFlipped ? 'VERSO (RESPOSTA)' : 'FRENTE (PERGUNTA)'}
                  </span>

                  <p
                    className={`text-sm font-bold ${
                      isCardFlipped ? 'text-indigo-100' : 'text-slate-800 dark:text-white'
                    } leading-relaxed`}
                  >
                    {isCardFlipped ? card.verso : card.frente}
                  </p>
                </div>

                {/* Card Bottom Flip Indicator */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:text-indigo-400 transition-colors">
                  <span className="flex items-center gap-1 font-semibold">
                    <RotateCw className="w-3 h-3 animate-spin-slow" />
                    <span>{isCardFlipped ? 'Ver Pergunta' : 'Ver Resposta'}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                    {isCardFlipped ? 'Verso' : 'Frente'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Card Focus Slideshow Mode */
        <div className="max-w-3xl mx-auto space-y-6">
          {currentSlideshowCard && (
            <div
              onClick={() => handleToggleFlip(currentSlideshowCard.id)}
              className={`cursor-pointer min-h-[320px] bg-gradient-to-b ${
                flippedCardIds.has(currentSlideshowCard.id)
                  ? 'from-indigo-950 via-slate-900 to-slate-950 border-indigo-500/60'
                  : 'from-slate-900 via-slate-900 to-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700'
              } border rounded-3xl p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 relative group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-950/80 border border-indigo-800/60 px-3 py-1 rounded-full uppercase">
                  {currentSlideshowCard.materia || 'Geral'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-500">
                    {currentIndex + 1} / {filteredCards.length}
                  </span>
                  <button
                    onClick={(e) => handleDeleteCard(currentSlideshowCard.id, e)}
                    className="p-1.5 text-slate-500 dark:text-slate-500 hover:text-rose-400 rounded-xl hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                    title="Excluir card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="my-auto py-6 text-center space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-500 block">
                  {flippedCardIds.has(currentSlideshowCard.id) ? 'VERSO (RESPOSTA)' : 'FRENTE (PERGUNTA)'}
                </span>
                <p
                  className={`text-lg md:text-xl font-bold ${
                    flippedCardIds.has(currentSlideshowCard.id) ? 'text-indigo-200' : 'text-slate-800 dark:text-white'
                  } leading-relaxed max-w-2xl mx-auto`}
                >
                  {flippedCardIds.has(currentSlideshowCard.id)
                    ? currentSlideshowCard.verso
                    : currentSlideshowCard.frente}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-500 group-hover:text-slate-900 dark:text-indigo-400 transition-colors">
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Clique em qualquer lugar para virar o cartão</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-4">
            <button
              onClick={handlePrev}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-3 rounded-2xl transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Cartão {currentIndex + 1} de {filteredCards.length}
            </span>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs px-5 py-3 rounded-2xl transition-all"
            >
              <span>Próximo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Criar Novo Flashcard</h3>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">Disciplina</label>
                <input
                  type="text"
                  placeholder="Ex: Direito Constitucional"
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Frente (Pergunta/Conceito) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={frente}
                  onChange={(e) => setFrente(e.target.value)}
                  placeholder="Ex: Qual o prazo prescricional da pretensão punitiva do Estado?"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Verso (Resposta/Explicação) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={verso}
                  onChange={(e) => setVerso(e.target.value)}
                  placeholder="Ex: Varia conforme a pena máxima cominada ao crime (Art. 109 do CP)."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg"
                >
                  Salvar Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              Gerar Flashcards com IA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Defina o tema e a quantidade para o Gemini criar cartões otimizados.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">Assunto/Tema *</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Quantidade de Cards
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={aiNumCards}
                  onChange={(e) => setAiNumCards(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>

              {aiError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {aiError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  disabled={loadingAi || !aiTopic.trim()}
                  onClick={handleGenerateAiCards}
                  className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <span>Gerar Cards</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
