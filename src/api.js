const API = 'http://localhost:3000/api'
const getToken = () => localStorage.getItem('token')
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` })
const authH = () => ({ Authorization: `Bearer ${getToken()}` })

const req = (url, opts = {}) =>
  fetch(`${API}${url}`, opts).then(async r => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Request failed')
    return data
  })

export const api = {
  signup: (data) => req('/signup', { method: 'POST', headers: h(), body: JSON.stringify(data) }),
  login: (data) => req('/login', { method: 'POST', headers: h(), body: JSON.stringify(data) }),

  uploadFile: (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API}/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        xhr.status === 200 ? resolve(data) : reject(new Error(data.error))
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  },

  getNotes: () => req('/notes', { headers: h() }),
  saveNote: (data) => req('/notes', { method: 'POST', headers: h(), body: JSON.stringify(data) }),
  deleteNote: (id) => req(`/notes/${id}`, { method: 'DELETE', headers: h() }),

  getQuizzes: () => req('/quizzes', { headers: h() }),
  saveQuiz: (data) => req('/quizzes', { method: 'POST', headers: h(), body: JSON.stringify(data) }),

  getClassrooms: () => req('/classrooms', { headers: authH() }),
  createClassroom: (data) => req('/classrooms', { method: 'POST', headers: h(), body: JSON.stringify(data) }),
  joinClassroom: (code) => req('/classrooms/join', { method: 'POST', headers: h(), body: JSON.stringify({ code }) }),

  getStats: () => req('/stats', { headers: h() }),
}
