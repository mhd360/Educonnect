
// Chave única para salvar no localStorage
const STORAGE_KEY = 'educonnect_data_v1';

// Estrutura básica inicial
const DEFAULT_DATA = {
  users: {
    // Admin único
    '0001': { matricula: '0001', nome: 'Admin Geral', role: 'admin', senha: 'Admin123' },
    // Alguns alunos exemplo
    'A1001': { matricula: 'A1001', nome: 'Ana Silva', role: 'aluno', senha: 'Aluno123' },
    'A1002': { matricula: 'A1002', nome: 'Bruno Souza', role: 'aluno', senha: 'Aluno123' },
    // Professores exemplo
    'P2001': { matricula: 'P2001', nome: 'Prof. Carlos', role: 'professor', senha: 'Profe123' },
    'P2002': { matricula: 'P2002', nome: 'Prof. Daniela', role: 'professor', senha: 'Profe123' }
  },

  // Notas por aluno
  grades: {
    // chave = matrícula do aluno
    A1001: [
      { disciplina: 'Lógica',  p1: 8.5, p2: 3.2, p3: 6.5 },
      { disciplina: 'Python',  p1: 7.2, p2: 9.0, p3: 9.0 },
      { disciplina: 'SQL',     p1: 6.8, p2: 8.3, p3: 10 },
      { disciplina: 'APIs',    p1: 4.5, p2: 7.0, p3: 8.2 },
      { disciplina: 'React',   p1: 9.0, p2: 8.7, p3: 6.7 }
    ],
    A1002: [
      { disciplina: 'Lógica',  p1: 7.0, p2: 6.5, p3: 8.0 },
      { disciplina: 'Python',  p1: 8.0, p2: 7.5, p3: 9.0 },
      { disciplina: 'SQL',     p1: 5.7, p2: 6.0, p3: 6.7 },
      { disciplina: 'APIs',    p1: 3.2, p2: 7.0, p3: 9.8 },
      { disciplina: 'React',   p1: 7.4, p2: 5.3, p3: 4.5 }
    ]
  },

  // Eventos do calendário (compartilhado por turma)
  events: [
    { date: '2025-12-23', time: '11:00',    title: 'Entrega: Atividade 2 - Python', desc: 'Entrega via portal.' },
    { date: '2025-12-23', time: '14:00',    title: 'Prova 3 - React',               desc: 'Conteúdo: hooks e roteamento.' },
    { date: '2025-12-25', time: 'Dia todo', title: 'Recesso',                       desc: 'Sem aulas.' }
  ]
};

// Carrega do localStorage ou usa DEFAULT_DATA
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Mantém uma instância global simples
window.ECData = {
  getAll() {
    if (!this._data) this._data = loadData();
    return this._data;
  },
  save() {
    if (this._data) saveData(this._data);
  },
  reset() {
    this._data = structuredClone(DEFAULT_DATA);
    this.save();
  }
};
