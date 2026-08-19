export type MaterialType = 'text' | 'link' | 'focus' | 'pdf' | 'notebooklm';

export interface MaterialItem {
  id: string;
  title: string;
  type: MaterialType;
  url?: string;
  entryId?: string;
  partnerId?: string;
  data?: string; // Text body content or Base64/PDF key
  completed?: boolean;
  category?: string;
  createdAt?: number;
}

export interface QuestionStructure {
  id: string;
  materia: string;
  questoes: number;
  peso: number;
}

export interface CourseEtapa {
  nome: string;
  caracter: string; // 'Eliminatória e Classificatória' | etc
  detalhes?: string;
}

export interface DisciplineItem {
  id: string;
  name: string;
  color?: string; // 'emerald' | 'indigo' | 'cyan' | 'amber' | 'rose' | 'purple' | 'blue' | 'slate'
}

export interface CourseData {
  id: string;
  title: string;
  banca?: string;
  vagas?: string;
  remuneracao?: string;
  requisitos?: string;
  resumoIA?: string;
  carreira?: string[];
  etapas?: CourseEtapa[];
  questoes?: QuestionStructure[];
  materials?: MaterialItem[];
  disciplines?: DisciplineItem[];
  progress?: number;
  updatedAt?: number;
}

export interface ExamQuestion {
  id: string;
  enunciado: string;
  opcoes: string[];
  respostaCorreta: number; // Index 0-3
  explicacao: string;
  materia?: string;
}

export interface SimuladoItem {
  id: string;
  title: string;
  dataCriacao: string;
  questoes: ExamQuestion[];
  status: 'pending' | 'completed';
  lastScore?: number; // Score 0-100
  totalQuestions?: number;
  correctAnswers?: number;
  dataRealizacao?: string;
}

export interface Flashcard {
  id: string;
  frente: string;
  verso: string;
  materia?: string;
  createdAt?: number;
}

export interface NotesMeta {
  text: string;
  updatedAt: number;
}

export type TafGender = 'M' | 'F';

export interface TafTestConfig {
  id: string;
  nome: string;
  minM: number;
  minF: number;
  unit: string; // e.g. 'rep', 'm', 's'
  higherIsBetter: boolean;
}

export interface TafConfig {
  hasTaf: boolean;
  tests: TafTestConfig[];
}

export interface TafResult {
  gender: TafGender;
  flexaoCount: number;
  flexaoStatus: 'APTO' | 'INAPTO';
  abdominalCount: number;
  abdominalStatus: 'APTO' | 'INAPTO';
  corridaMeters: number;
  corridaStatus: 'APTO' | 'INAPTO';
  tiroSeconds: number;
  tiroStatus: 'APTO' | 'INAPTO';
  isOverallApto: boolean;
}

export interface DailyTimeLog {
  date: string;
  totalSeconds: number; // e.g. 10800 for 3h
  targetSeconds: number; // e.g. 10800
}
