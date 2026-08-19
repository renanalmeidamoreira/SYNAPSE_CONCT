import React, { useState } from 'react';
import { TafGender, TafResult } from '../types';
import { Activity, Flame, Trophy, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export const TafView: React.FC = () => {
  const [gender, setGender] = useState<TafGender>('M');
  const [flexao, setFlexao] = useState<number>(25);
  const [abdominal, setAbdominal] = useState<number>(32);
  const [corrida, setCorrida] = useState<number>(2300);
  const [tiro, setTiro] = useState<number>(8.2);

  // Standard requirements based on GCM / Polícia Militar standards
  const flexaoMin = gender === 'M' ? 24 : 18;
  const abdominalMin = gender === 'M' ? 30 : 25;
  const corridaMin = gender === 'M' ? 2200 : 1800;
  const tiroMax = gender === 'M' ? 8.5 : 9.5;

  const flexaoStatus = flexao >= flexaoMin ? 'APTO' : 'INAPTO';
  const abdominalStatus = abdominal >= abdominalMin ? 'APTO' : 'INAPTO';
  const corridaStatus = corrida >= corridaMin ? 'APTO' : 'INAPTO';
  const tiroStatus = tiro <= tiroMax ? 'APTO' : 'INAPTO';

  const isOverallApto =
    flexaoStatus === 'APTO' &&
    abdominalStatus === 'APTO' &&
    corridaStatus === 'APTO' &&
    tiroStatus === 'APTO';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Simulador de TAF (Teste de Aptidão Física)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Acompanhe suas marcas nos 4 testes padrão do Edital da Guarda Civil Municipal
          </p>
        </div>

        {/* Gender Toggle Selector */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setGender('M')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              gender === 'M'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
            }`}
          >
            Masculino (M)
          </button>
          <button
            onClick={() => setGender('F')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              gender === 'F'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
            }`}
          >
            Feminino (F)
          </button>
        </div>
      </div>

      {/* Overall Score Status Banner */}
      <div
        className={`p-6 rounded-3xl border ${
          isOverallApto
            ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
            : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
        } flex items-center justify-between shadow-xl`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl ${
              isOverallApto ? 'bg-emerald-900 border-emerald-700' : 'bg-rose-900 border-rose-700'
            } border flex items-center justify-center shrink-0`}
          >
            {isOverallApto ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
              Resultado Geral do TAF
            </span>
            <h4 className="text-xl font-extrabold tracking-tight">
              {isOverallApto ? 'APTO NO TESTE FÍSICO' : 'INAPTO (Abaixo da Meta Mínima)'}
            </h4>
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <span className="text-xs font-mono font-bold">
            Gênero: {gender === 'M' ? 'Masculino' : 'Feminino'}
          </span>
        </div>
      </div>

      {/* Test Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test 1: Flexão de Braço */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">1. Flexão de Braço (1 min)</h5>
              <span className="text-xs text-slate-600 dark:text-slate-400">Meta mínima: {flexaoMin} repetições</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                flexaoStatus === 'APTO'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {flexaoStatus}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 dark:text-slate-400">Sua marca:</span>
              <span className="text-slate-800 dark:text-white font-bold">{flexao} repetições</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={flexao}
              onChange={(e) => setFlexao(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Test 2: Abdominal Remador */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">2. Abdominal Remador (1 min)</h5>
              <span className="text-xs text-slate-600 dark:text-slate-400">Meta mínima: {abdominalMin} repetições</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                abdominalStatus === 'APTO'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {abdominalStatus}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 dark:text-slate-400">Sua marca:</span>
              <span className="text-slate-800 dark:text-white font-bold">{abdominal} repetições</span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              value={abdominal}
              onChange={(e) => setAbdominal(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Test 3: Corrida 12 min */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">3. Corrida de 12 Minutos</h5>
              <span className="text-xs text-slate-600 dark:text-slate-400">Meta mínima: {corridaMin}m</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                corridaStatus === 'APTO'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {corridaStatus}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 dark:text-slate-400">Distância percorrida:</span>
              <span className="text-slate-800 dark:text-white font-bold">{corrida} metros</span>
            </div>
            <input
              type="range"
              min="1000"
              max="3500"
              step="50"
              value={corrida}
              onChange={(e) => setCorrida(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Test 4: Tiro 50m */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-slate-800 dark:text-white">4. Tiro de Velocidade (50m)</h5>
              <span className="text-xs text-slate-600 dark:text-slate-400">Tempo máximo: {tiroMax}s</span>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                tiroStatus === 'APTO'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}
            >
              {tiroStatus}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1 font-mono">
              <span className="text-slate-600 dark:text-slate-400">Seu tempo:</span>
              <span className="text-slate-800 dark:text-white font-bold">{tiro.toFixed(1)} segundos</span>
            </div>
            <input
              type="range"
              min="5.0"
              max="15.0"
              step="0.1"
              value={tiro}
              onChange={(e) => setTiro(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
