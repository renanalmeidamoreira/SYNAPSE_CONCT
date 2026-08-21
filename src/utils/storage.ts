import { CourseData, SimuladoItem, Flashcard, NotesMeta, MaterialItem } from '../types';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const STORAGE_KEY_COURSES = 'synapse_courses_v5';
const STORAGE_KEY_ACTIVE = 'synapse_active_course_v5';
const STORAGE_KEY_DAILY = 'synapse_daily_time_v5';

// Helper to get all courses
export function getCoursesFromStorage(): CourseData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COURSES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading courses:', e);
    return [];
  }
}

// Helper to save all courses
export function saveCoursesToStorage(courses: CourseData[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
  } catch (e) {
    console.error('Error saving courses:', e);
  }
}

// Get single course
export function getCourse(id: string): CourseData | null {
  const list = getCoursesFromStorage();
  return list.find((c) => String(c.id) === String(id)) || null;
}

// Save or update single course
export function saveCourse(course: CourseData) {
  const list = getCoursesFromStorage();
  const idx = list.findIndex((c) => String(c.id) === String(course.id));
  course.updatedAt = Date.now();
  if (idx >= 0) {
    list[idx] = course;
  } else {
    list.push(course);
  }
  saveCoursesToStorage(list);
  triggerSync();
}

// Delete course and clean up related metadata
export function deleteCourse(id: string) {
  const list = getCoursesFromStorage();
  const filtered = list.filter((c) => String(c.id) !== String(id));
  saveCoursesToStorage(filtered);

  // Remove metadata associated with course
  localStorage.removeItem(`synapse_meta_${id}_simulados`);
  localStorage.removeItem(`synapse_meta_${id}_flashcards`);
  localStorage.removeItem(`synapse_meta_${id}_notes`);
  localStorage.removeItem(`synapse_meta_${id}_checklists`);

  if (getActiveCourseId() === String(id)) {
    setActiveCourseId(null);
  }
  
  const user = auth.currentUser;
  if (user) {
    deleteDoc(doc(db, 'users', user.uid, 'courses', id)).catch(e => console.warn('Delete course doc offline or failed:', e));
    deleteDoc(doc(db, 'users', user.uid, 'meta', id)).catch(e => console.warn('Delete course meta offline or failed:', e));
  }
}

// Active course ID management
export function getActiveCourseId(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACTIVE);
}

export function setActiveCourseId(id: string | null) {
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
  }
}

// Metadata management (simulados, flashcards, notes, checklists)
export function getMeta<T>(courseId: string, key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`synapse_meta_${courseId}_${key}`);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}

export function saveMeta<T>(courseId: string, key: string, data: T) {
  try {
    localStorage.setItem(`synapse_meta_${courseId}_${key}`, JSON.stringify(data));
    triggerSync();
  } catch (e) {
    console.error(`Error saving meta ${key}:`, e);
  }
}

// Daily study time log management
export function getDailyTime(): { totalSeconds: number; targetSeconds: number; date: string } {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === todayStr) {
        return parsed;
      }
    }
  } catch (e) {}

  return { totalSeconds: 1800, targetSeconds: 10800, date: todayStr }; // 30m default progress, 3h goal
}

export function addDailyTimeSeconds(sec: number) {
  const current = getDailyTime();
  current.totalSeconds += sec;
  localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(current));
  return current;
}

export function createUnifiedStation(type: 'policiais' | 'adm' | 'tribunais'): CourseData {
  if (type === 'policiais') {
    const id = `estacao-policiais-${Date.now()}`;
    const course: CourseData = {
      id,
      title: 'Estação Unificada Carreiras Policiais (GCM + Polícia Civil + PM)',
      banca: 'VUNESP / IBFC / CEBRASPE',
      vagas: '3.500+ Vagas Unificadas',
      remuneracao: 'R$ 4.800,00 a R$ 8.900,00',
      requisitos: 'Ensino Médio / Superior + CNH B',
      carreira: [
        'Guarda Civil Municipal (Segurança Pública Municipal)',
        'Investigador & Escrivão da Polícia Civil',
        'Soldado e Oficial da Polícia Militar',
        'Policial Penal Estadual',
      ],
      etapas: [
        { nome: '1. Prova Objetiva Unificada', caracter: 'Eliminatória e Classificatória', detalhes: 'Cobrança do núcleo comum: Português, RLM, Informática, Constitucional e Penal.' },
        { nome: '2. Teste de Aptidão Física (TAF)', caracter: 'Eliminatório', detalhes: 'Flexão de braço, abdominal remador, corrida de 12 minutos e tiro de 50m.' },
        { nome: '3. Avaliação Psicológica e Investigação Social', caracter: 'Eliminatória', detalhes: 'Perfil compatível com porte de arma de fogo e atividade policial.' },
      ],
      questoes: [
        { id: 'q-p1', materia: 'Língua Portuguesa', questoes: 15, peso: 1.5 },
        { id: 'q-p2', materia: 'Raciocínio Lógico & Informática', questoes: 10, peso: 1.0 },
        { id: 'q-p3', materia: 'Direito Constitucional & Direitos Humanos', questoes: 15, peso: 2.0 },
        { id: 'q-p4', materia: 'Direito Penal & Processual Penal', questoes: 15, peso: 2.0 },
        { id: 'q-p5', materia: 'Legislação Específica & CTB', questoes: 10, peso: 1.5 },
      ],
      materials: [
        {
          id: `mat-${Date.now()}-1`,
          title: 'Resumo Núcleo Comum: Direitos Individuais e Garantias (Art. 5º CF/88)',
          type: 'text',
          category: 'Direito Constitucional',
          data: `CONSTITUIÇÃO FEDERAL - ARTIGO 5º (NÚCLEO COMUM PARA GCM, PC E PM)
1. Inviolabilidade do Domicílio: A casa é asilo inviolável. Exceções à noite: flagrante delito, desastre ou prestar socorro.
2. Inviolabilidade das Comunicações e Sigilo Bancário/Fiscal.
3. Prisão em Flagrante e Mandado Judicial Fundamentado.
4. Direitos do Preso: Informação de direitos, direito ao silêncio e à assistência da família.`,
          completed: true,
          createdAt: Date.now() - 300000,
        },
        {
          id: `mat-${Date.now()}-2`,
          title: 'Videoaula: Crimes Contra a Administração Pública (CP Arts. 312 a 327)',
          type: 'link',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Direito Penal',
          completed: false,
          createdAt: Date.now() - 200000,
        },
        {
          id: `mat-${Date.now()}-3`,
          title: 'Focus LMS: Videoaula de Código de Trânsito Brasileiro (CTB)',
          type: 'focus',
          url: 'https://moodle.focusconcursos.com.br/watch?entry_id=1_ctb2026',
          entryId: '1_ctb2026',
          partnerId: '2608811',
          category: 'Legislação de Trânsito',
          completed: false,
          createdAt: Date.now() - 100000,
        },
        {
          id: `mat-${Date.now()}-4`,
          title: 'Caderno de Estudo Inteligente NotebookLM: Direito Processual Penal',
          type: 'notebooklm',
          url: 'https://notebooklm.google.com',
          category: 'IA & Resumos',
          completed: false,
          createdAt: Date.now(),
        },
      ],
      progress: 25,
      updatedAt: Date.now(),
    };

    saveCourse(course);
    saveMeta(id, 'taf_config', {
      hasTaf: true,
      tests: [
        { id: 't-1', nome: 'Flexão de Braço (1 min)', minM: 24, minF: 18, unit: 'rep', higherIsBetter: true },
        { id: 't-2', nome: 'Abdominal Remador (1 min)', minM: 30, minF: 25, unit: 'rep', higherIsBetter: true },
        { id: 't-3', nome: 'Corrida de 12 Minutos', minM: 2200, minF: 1800, unit: 'm', higherIsBetter: true },
        { id: 't-4', nome: 'Tiro de Velocidade (50m)', minM: 8.5, minF: 9.5, unit: 's', higherIsBetter: false },
      ],
    });

    saveMeta(id, 'simulados', {
      list: [
        {
          id: `sim-${id}-1`,
          title: 'Simulado Unificado 01 - Carreiras Policiais (Núcleo Comum)',
          dataCriacao: new Date().toISOString().split('T')[0],
          status: 'completed',
          lastScore: 85,
          totalQuestions: 2,
          correctAnswers: 2,
          questoes: [
            {
              id: 'sq-p1',
              materia: 'Direito Constitucional',
              enunciado: 'Em relação ao direito de reunião pacífica (Art. 5º, XVI), assinale a afirmativa correta:',
              opcoes: [
                'Exige autorização prévia da autoridade policial.',
                'Não exige autorização, apenas prévio aviso à autoridade competente.',
                'É proibido em praças públicas durante fins de semana.',
                'Só é permitido com presença ostensiva da Guarda Municipal.',
              ],
              respostaCorreta: 1,
              explicacao: 'O direito de reunião é livre, sem armas, em locais abertos ao público, independentemente de autorização, desde que não frustre outra reunião e haja prévio aviso.',
            },
            {
              id: 'sq-p2',
              materia: 'Direito Penal',
              enunciado: 'Apropriação de dinheiro ou valor público por funcionário que o tem em posse em razão do cargo configura:',
              opcoes: ['Concussão', 'Prevaricação', 'Peculato', 'Corrupção Passiva'],
              respostaCorreta: 2,
              explicacao: 'Trata-se do crime de Peculato (Art. 312 do Código Penal).',
            },
          ],
        },
      ],
    });

    saveMeta(id, 'flashcards', {
      list: [
        {
          id: `fc-${id}-1`,
          materia: 'Direito Constitucional',
          frente: 'Em que hipótese é permitido ingressar em domicílio à noite sem consentimento do morador?',
          verso: 'Apenas em caso de flagrante delito, desastre ou para prestar socorro (Art. 5º, XI CF/88).',
        },
        {
          id: `fc-${id}-2`,
          materia: 'Direito Penal',
          frente: 'O que caracteriza o crime de Concussão?',
          verso: 'EXIGIR vantagem indevida, direta ou indiretamente, em razão da função pública (Art. 316 CP).',
        },
        {
          id: `fc-${id}-3`,
          materia: 'Legislação de Trânsito',
          frente: 'Qual a velocidade máxima em via arterial urbana não sinalizada?',
          verso: '60 km/h (Via Arterial = 60km/h; Trânsito Rápido = 80km/h; Coletora = 40km/h).',
        },
      ],
    });

    saveMeta(id, 'notes', {
      text: `CADERNO DE ESTUDOS UNIFICADO - CARREIRAS POLICIAIS (GCM + PC + PM)

📌 ESTRATÉGIA DE ESTUDO UNIFICADO:
O núcleo de Direito Constitucional (Art. 5º e Art. 144) e Direito Penal (Crimes contra a Administração e contra a Pessoa) é 100% aproveitável entre GCM, Polícia Civil e Polícia Militar.

📌 REGRAS CHAVE MEMORIZADAS:
- Domicílio à noite: Flagrante, Desastre ou Socorro.
- Prisão em flagrante: Pode ser efetuada por qualquer do povo e DEVE ser efetuada pela autoridade policial.
- TAF: Treinar corrida de 12 min 3x por semana mantendo ritmo abaixo de 5:30/km.`,
    });

    return course;
  } else if (type === 'adm') {
    const id = `estacao-adm-${Date.now()}`;
    const course: CourseData = {
      id,
      title: 'Estação Unificada Carreiras Administrativas (INSS + PF Adm + Bancos)',
      banca: 'CEBRASPE / FGV / Cesgranrio',
      vagas: '5.000+ Vagas Unificadas',
      remuneracao: 'R$ 4.200,00 a R$ 9.300,00',
      requisitos: 'Ensino Médio / Superior Completo',
      carreira: [
        'Técnico do Seguro Social (INSS)',
        'Agente Administrativo da Polícia Federal (PF)',
        'Técnico Bancário (Banco do Brasil & Caixa Econômica)',
        'Assistente em Administração (Universidades & IFs)',
      ],
      etapas: [
        { nome: '1. Prova Objetiva Unificada', caracter: 'Eliminatória e Classificatória', detalhes: 'Português, RLM/Matemática Financeira, Informática/IA, Direito Administrativo e Atendimento.' },
        { nome: '2. Prova de Redação / Discursiva', caracter: 'Eliminatória e Classificatória', detalhes: 'Texto dissertativo-argumentativo sobre tema da atualidade ou administração pública.' },
      ],
      questoes: [
        { id: 'q-a1', materia: 'Língua Portuguesa & Redação', questoes: 15, peso: 1.5 },
        { id: 'q-a2', materia: 'Raciocínio Lógico & Matemática Fin.', questoes: 10, peso: 1.0 },
        { id: 'q-a3', materia: 'Informática & Inteligência Artificial', questoes: 10, peso: 1.0 },
        { id: 'q-a4', materia: 'Direito Administrativo & Constitucional', questoes: 15, peso: 2.0 },
        { id: 'q-a5', materia: 'Conhecimentos Específicos & Atendimento', questoes: 15, peso: 2.0 },
      ],
      materials: [
        {
          id: `mat-${Date.now()}-10`,
          title: 'Resumo LIMPE: Princípios Expressos da Administração Pública',
          type: 'text',
          category: 'Direito Administrativo',
          data: `PRINCÍPIOS EXPRESSOS DA ADMINISTRAÇÃO PÚBLICA (ART. 37 CAPUT CF/88)
L - Legalidade: O administrador só pode fazer o que a lei autoriza.
I - Impessoalidade: Vedação à promoção pessoal e tratamento isonômico.
M - Moralidade: Atuação com ética, boa-fé e probidade.
P - Publicidade: Transparência dos atos oficiais (salvo sigilo constitucional).
E - Eficiência: Busca por qualidade, presteza e rendimento funcional.`,
          completed: true,
          createdAt: Date.now() - 300000,
        },
        {
          id: `mat-${Date.now()}-11`,
          title: 'Focus LMS: Videoaula de Raciocínio Lógico & Porcentagem',
          type: 'focus',
          url: 'https://moodle.focusconcursos.com.br/watch?entry_id=1_rlmadm',
          entryId: '1_rlmadm',
          partnerId: '2608811',
          category: 'Raciocínio Lógico',
          completed: false,
          createdAt: Date.now() - 200000,
        },
        {
          id: `mat-${Date.now()}-12`,
          title: 'Videoaula: Atendimento Qualificado & LGPD no Setor Público',
          type: 'link',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          category: 'Atendimento & Ética',
          completed: false,
          createdAt: Date.now() - 100000,
        },
      ],
      progress: 33,
      updatedAt: Date.now(),
    };

    saveCourse(course);
    saveMeta(id, 'taf_config', {
      hasTaf: false,
      tests: [],
    });

    saveMeta(id, 'simulados', {
      list: [
        {
          id: `sim-${id}-1`,
          title: 'Simulado Unificado Carreiras Administrativas (Português + Admin)',
          dataCriacao: new Date().toISOString().split('T')[0],
          status: 'pending',
          totalQuestions: 2,
          questoes: [
            {
              id: 'sq-a1',
              materia: 'Direito Administrativo',
              enunciado: 'Qual princípio veda a utilização de nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades em publicidade de atos governamentais?',
              opcoes: ['Legalidade', 'Impessoalidade', 'Eficiência', 'Autotutela'],
              respostaCorreta: 1,
              explicacao: 'O princípio da Impessoalidade (Art. 37, § 1º da CF/88) proíbe promoção pessoal de autoridades.',
            },
            {
              id: 'sq-a2',
              materia: 'Informática',
              enunciado: 'O conceito de computação em nuvem que disponibiliza infraestrutura de servidores virtuais sob demanda é:',
              opcoes: ['SaaS', 'PaaS', 'IaaS', 'DaaS'],
              respostaCorreta: 2,
              explicacao: 'IaaS (Infrastructure as a Service) fornece infraestrutura virtualizada.',
            },
          ],
        },
      ],
    });

    saveMeta(id, 'flashcards', {
      list: [
        {
          id: `fc-${id}-1`,
          materia: 'Direito Administrativo',
          frente: 'O que é o Princípio da Autotutela da Administração Pública?',
          verso: 'É o poder-dever da Administração de rever seus próprios atos, anulando os ilegais e revogando os inoportunos (Súmulas 346 e 473 do STF).',
        },
      ],
    });

    saveMeta(id, 'notes', {
      text: `CADERNO DE ESTUDOS UNIFICADO - CARREIRAS ADMINISTRATIVAS

📌 NÚCLEO COMUM:
- Português, RLM, Informática e Direito Administrativo cobrem 70% da pontuação do INSS, PF Adm e Concursos Bancários.
- Foco em entender atos administrativos, licitações (Lei 14.133/21) e atendimento ao cliente.`,
    });

    return course;
  } else {
    // Tribunais
    const id = `estacao-tribunais-${Date.now()}`;
    const course: CourseData = {
      id,
      title: 'Estação Unificada Tribunais & MPU (TJ + TRT + MPU + Defensoria)',
      banca: 'VUNESP / FCC / FGV',
      vagas: '2.000+ Vagas Unificadas',
      remuneracao: 'R$ 8.500,00 a R$ 14.800,00',
      requisitos: 'Ensino Superior Completo (Qualquer Área ou Direito)',
      carreira: [
        'Escrevente Técnico Judiciário (TJ SP/RJ/MG)',
        'Técnico e Analista Judiciário (TRT / TRF / TSE)',
        'Técnico do Ministério Público da União (MPU)',
      ],
      etapas: [
        { nome: '1. Prova Objetiva Unificada', caracter: 'Eliminatória e Classificatória', detalhes: 'Português, RLM, Informática, Constitucional, Administrativo, Processual Civil e Penal.' },
        { nome: '2. Prova Prática / Discursiva', caracter: 'Eliminatória e Classificatória', detalhes: 'Estudo de caso ou prova prática de digitação/formatação de texto para TJ.' },
      ],
      questoes: [
        { id: 'q-t1', materia: 'Língua Portuguesa', questoes: 20, peso: 1.5 },
        { id: 'q-t2', materia: 'Raciocínio Lógico & Informática', questoes: 10, peso: 1.0 },
        { id: 'q-t3', materia: 'Direito Constitucional & Administrativo', questoes: 15, peso: 2.0 },
        { id: 'q-t4', materia: 'Direito Processual Civil & Penal', questoes: 15, peso: 2.0 },
      ],
      materials: [
        {
          id: `mat-${Date.now()}-20`,
          title: 'Resumo Prazos e Citações no Código de Processo Civil (CPC)',
          type: 'text',
          category: 'Direito Processual Civil',
          data: `DISPOSIÇÕES FUNDAMENTAIS DO CPC:
1. Prazos Processuais: Contam-se somente em DIAS ÚTEIS (Art. 219 do CPC).
2. Citação: Ato pelo qual se convoca o réu para integrar a relação processual.
3. Intimação: Ato pelo qual se dá ciência de atos e termos do processo.`,
          completed: true,
          createdAt: Date.now() - 200000,
        },
        {
          id: `mat-${Date.now()}-21`,
          title: 'Focus LMS: Videoaula de Normas da Corregedoria Geral da Justiça',
          type: 'focus',
          url: 'https://moodle.focusconcursos.com.br/watch?entry_id=1_normastj',
          entryId: '1_normastj',
          partnerId: '2608811',
          category: 'Normas da Corregedoria',
          completed: false,
          createdAt: Date.now() - 100000,
        },
      ],
      progress: 50,
      updatedAt: Date.now(),
    };

    saveCourse(course);
    saveMeta(id, 'taf_config', {
      hasTaf: false,
      tests: [],
    });

    saveMeta(id, 'simulados', {
      list: [
        {
          id: `sim-${id}-1`,
          title: 'Simulado Unificado Tribunais (Processos e Direito)',
          dataCriacao: new Date().toISOString().split('T')[0],
          status: 'completed',
          lastScore: 90,
          totalQuestions: 1,
          correctAnswers: 1,
          questoes: [
            {
              id: 'sq-t1',
              materia: 'Direito Processual Civil',
              enunciado: 'Nos termos do CPC/2015, a contagem dos prazos processuais dar-se-á considerando:',
              opcoes: ['Apenas dias corridos.', 'Apenas dias úteis.', 'Dias úteis para o autor e corridos para o réu.', 'Meses e semanas sem feriados.'],
              respostaCorreta: 1,
              explicacao: 'O Artigo 219 do CPC determina a contagem de prazos em dias úteis.',
            },
          ],
        },
      ],
    });

    saveMeta(id, 'flashcards', {
      list: [
        {
          id: `fc-${id}-1`,
          materia: 'Direito Processual Civil',
          frente: 'Como são contados os prazos no Novo CPC?',
          verso: 'Contam-se somente os DIAS ÚTEIS (Art. 219 CPC).',
        },
      ],
    });

    saveMeta(id, 'notes', {
      text: `CADERNO DE ESTUDOS UNIFICADO - TRIBUNAIS E MPU

📌 NÚCLEO PROCESSUAL:
- A disciplina de Direito Processual Civil e Penal é decisiva nas provas de Escrevente e Técnico Judiciário.
- Atenção máxima para o texto seco da lei (Lei Seca) cobrado pela VUNESP e FCC.`,
    });

    return course;
  }
}

export async function syncToFirestore(uid: string) {
  try {
    const courses = getCoursesFromStorage();
    if (!courses.length) return;
    const batch = writeBatch(db);

    for (const course of courses) {
      const courseRef = doc(db, 'users', uid, 'courses', course.id);
      const courseDataToSave = { ...course, userId: uid };
      batch.set(courseRef, courseDataToSave);

      const simulados = getMeta(course.id, 'simulados', { list: [] });
      const flashcards = getMeta(course.id, 'flashcards', { list: [] });
      const notes = getMeta(course.id, 'notes', { text: '' });
      const checklists = getMeta(course.id, 'checklists', {});

      const metaRef = doc(db, 'users', uid, 'meta', course.id);
      batch.set(metaRef, {
        userId: uid,
        simulados: JSON.stringify(simulados),
        flashcards: JSON.stringify(flashcards),
        notes: JSON.stringify(notes),
        checklists: JSON.stringify(checklists),
      });
    }

    await batch.commit();
  } catch (error) {
    console.warn('Error syncing to Firestore (client may be offline):', error);
  }
}

export async function loadFromFirestore(uid: string) {
  try {
    const coursesSnap = await getDocs(collection(db, 'users', uid, 'courses'));
    const metaSnap = await getDocs(collection(db, 'users', uid, 'meta'));

    if (coursesSnap.empty) return;

    const loadedCourses: CourseData[] = [];
    coursesSnap.forEach(doc => {
      loadedCourses.push(doc.data() as CourseData);
    });

    if (loadedCourses.length > 0) {
      saveCoursesToStorage(loadedCourses);
    }

    metaSnap.forEach(doc => {
      const data = doc.data();
      const courseId = doc.id;
      if (data.simulados) saveMeta(courseId, 'simulados', JSON.parse(data.simulados));
      if (data.flashcards) saveMeta(courseId, 'flashcards', JSON.parse(data.flashcards));
      if (data.notes) saveMeta(courseId, 'notes', JSON.parse(data.notes));
      if (data.checklists) saveMeta(courseId, 'checklists', JSON.parse(data.checklists));
    });

  } catch (error) {
    console.warn('Error loading from Firestore (client may be offline):', error);
  }
}

export function triggerSync() {
  const user = auth.currentUser;
  if (user) {
    syncToFirestore(user.uid);
  }
}
