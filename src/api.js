const API = 'http://localhost:3000/api'

const getToken = () => localStorage.getItem('token')

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
})

export const api = {
  // Auth
  signup: (data) => fetch(`${API}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  login: (data) => fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  // Notes
  getNotes: () => fetch(`${API}/notes`, { headers: headers() }).then(r => r.json()),
  saveNote: (data) => fetch(`${API}/notes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteNote: (id) => fetch(`${API}/notes/${id}`, { 
    method: 'DELETE',
    headers: headers()
  }).then(r => r.json()),

  // Quizzes
  getQuizzes: () => fetch(`${API}/quizzes`, { headers: headers() }).then(r => r.json()),
  saveQuiz: (data) => fetch(`${API}/quizzes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  }).then(r => r.json()),

  // Classrooms
  getClassrooms: () => fetch(`${API}/classrooms`).then(r => r.json()),
  createClassroom: (data) => fetch(`${API}/classrooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  joinClassroom: (code) => fetch(`${API}/classrooms/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  }).then(r => r.json()),

  // Stats
  getStats: () => fetch(`${API}/stats`, { headers: headers() }).then(r => r.json())
}
