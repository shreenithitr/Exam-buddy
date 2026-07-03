import { useState, useEffect } from 'react'
import { api } from './api'
import Auth from './Auth'

function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [dark, setDark] = useState(false)
  const [file, setFile] = useState(null)
  const [summary, setSummary] = useState('')
  const [notes, setNotes] = useState([])
  const [quiz, setQuiz] = useState([])
  const [quizHistory, setQuizHistory] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [ans, setAns] = useState({})
  const [score, setScore] = useState(null)
  const [time, setTime] = useState(1500)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState('')
  const [stats, setStats] = useState({ notes: 0, quizzes: 0 })

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    try {
      const [n, q, c, s] = await Promise.all([
        api.getNotes(),
        api.getQuizzes(),
        api.getClassrooms(),
        api.getStats()
      ])
      setNotes(n)
      setQuizHistory(q)
      setClassrooms(c)
      setStats(s)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  useEffect(() => {
    dark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [dark])

  useEffect(() => {
    let i
    if (running && time > 0) i = setInterval(() => setTime(t => t - 1), 1000)
    return () => clearInterval(i)
  }, [running, time])

  const msg = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2000)
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFile(f)
      msg('File selected')
    }
  }

  const genSummary = () => {
    if (!file) return msg('Select a file')
    setTimeout(() => {
      setSummary('Key concepts: DBMS fundamentals, normalization (1NF-BCNF), SQL queries, ACID properties, indexing.')
      msg('Summary ready')
    }, 1500)
  }

  const saveNote = async () => {
    if (!file) return msg('Select a file')
    try {
      const note = await api.saveNote({ name: file.name, content: '', summary })
      setNotes([note, ...notes])
      msg('Saved')
    } catch {
      msg('Error saving')
    }
  }

  const genQuiz = () => {
    const q = [
      { q: 'What is DBMS?', opts: ['Database Management System', 'Data Backup System', 'Digital Base System', 'Database Monitor'], ans: 0 },
      { q: 'Which normal form removes transitive dependencies?', opts: ['1NF', '2NF', '3NF', 'BCNF'], ans: 2 },
      { q: 'What is a primary key?', opts: ['Nullable key', 'Unique identifier', 'Foreign key', 'Index key'], ans: 1 },
      { q: 'SQL command to retrieve data?', opts: ['GET', 'FETCH', 'SELECT', 'RETRIEVE'], ans: 2 },
      { q: 'ACID stands for?', opts: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Integration, Data', 'Auto, Consistent, Isolated, Durable', 'None'], ans: 0 }
    ]
    setQuiz(q.sort(() => Math.random() - 0.5).slice(0, 5))
    setAns({})
    setScore(null)
    msg('Quiz ready')
  }

  const submit = async () => {
    if (Object.keys(ans).length < quiz.length) return msg('Answer all')
    const s = quiz.filter((q, i) => ans[i] === q.ans).length
    setScore(s)
    try {
      await api.saveQuiz({ score: s, total: quiz.length, subject: 'DBMS' })
      const updated = await api.getQuizzes()
      setQuizHistory(updated)
      msg(`${s}/${quiz.length}`)
    } catch {
      msg('Error saving quiz')
    }
  }

  const createClass = async () => {
    try {
      const classroom = await api.createClassroom({ name: 'New Study Group' })
      setClassrooms([...classrooms, classroom])
      msg(classroom.code)
    } catch {
      msg('Error creating')
    }
  }

  const joinClass = async (code) => {
    try {
      await api.joinClassroom(code)
      msg('Joined')
      loadData()
    } catch {
      msg('Invalid code')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (!user) return <Auth onLogin={setUser} />

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-gradient-to-b from-indigo-900 to-indigo-950 text-white p-5 flex flex-col">
        <div className="text-xl font-bold mb-8">📝 Hussy Notes</div>
        
        <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3 mb-6">
          <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center font-semibold">{user.name[0].toUpperCase()}</div>
          <span className="text-sm">{user.name}</span>
        </div>

        <nav className="flex-1 space-y-2">
          {['dashboard', 'notes', 'quiz', 'classroom', 'leaderboard', 'timer'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`w-full text-left px-4 py-3 rounded-lg capitalize transition ${tab === t ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'}`}>
              {t}
            </button>
          ))}
        </nav>

        <button onClick={() => setDark(!dark)} className="w-full bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg text-xl transition mb-2">
          {dark ? '☀️' : '🌙'}
        </button>
        <button onClick={logout} className="w-full bg-red-500/20 hover:bg-red-500/30 px-4 py-3 rounded-lg text-sm transition">
          Logout
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {tab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold dark:text-white">Hey {user.name}</h1>
              <button className="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-lg transition">
                Share
              </button>
            </div>

            <div className="grid grid-cols-4 gap-5 mb-8">
              {[
                { label: 'Streak', value: '5 Days' },
                { label: 'Quizzes', value: stats.quizzes },
                { label: 'Rank', value: '#2' },
                { label: 'Points', value: '850' }
              ].map(stat => (
                <div key={stat.label} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:-translate-y-1 transition text-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{stat.label}</div>
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Recent Activity</h2>
                <div className="space-y-3">
                  {[
                    { title: 'DBMS Quiz - 8/10', time: '2 hours ago' },
                    { title: 'OS Notes uploaded', time: '5 hours ago' },
                    { title: 'Joined SEM-4 group', time: 'yesterday' }
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:translate-x-1 transition">
                      <div className="font-semibold dark:text-white">{item.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.time}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Badges</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '🎯', name: '10 Quizzes', earned: true },
                    { icon: '🔥', name: '5 Day Streak', earned: true },
                    { icon: '📚', name: '20 Notes', earned: false },
                    { icon: '👑', name: 'Rank 1', earned: false }
                  ].map((badge, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg text-center transition ${
                        badge.earned
                          ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white hover:scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 opacity-40'
                      }`}
                    >
                      <div className="text-2xl mb-1">{badge.icon}</div>
                      <div className="text-xs font-semibold">{badge.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 dark:text-white">Notes</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center mb-4">
                <p className="text-gray-500 dark:text-gray-400 mb-3">Drop files here</p>
                <input type="file" onChange={handleFile} className="hidden" id="file" />
                <label htmlFor="file" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg cursor-pointer inline-block transition">Browse</label>
              </div>

              {file && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4 flex items-center gap-3">
                  <div className="text-2xl">📄</div>
                  <div>
                    <div className="font-semibold dark:text-white">{file.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mb-4">
                <button onClick={genSummary} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition">Generate Summary</button>
                <button onClick={saveNote} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg transition">Save</button>
                <button onClick={() => { setFile(null); setSummary('') }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition">Delete</button>
              </div>

              {summary && (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border-l-4 border-indigo-600">
                  <h4 className="font-bold mb-2 dark:text-white">AI Summary</h4>
                  <p className="text-gray-700 dark:text-gray-300">{summary}</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Saved Notes</h3>
              <div className="grid grid-cols-4 gap-4">
                {notes.map((note) => (
                  <div key={note._id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center hover:-translate-y-1 transition cursor-pointer">
                    <div className="text-3xl mb-2">📄</div>
                    <div className="font-semibold text-sm dark:text-white">{note.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(note.date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'quiz' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 dark:text-white">Quiz</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
              <div className="flex justify-between items-center mb-6">
                <button onClick={genQuiz} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition">New Quiz</button>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{score !== null ? `${score}/${quiz.length}` : `0/${quiz.length}`}</div>
              </div>

              <div className="space-y-4">
                {quiz.map((q, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-l-4 border-indigo-600">
                    <h4 className="font-semibold mb-3 dark:text-white">Q{i + 1}: {q.q}</h4>
                    <div className="space-y-2">
                      {q.opts.map((opt, j) => (
                        <div key={j} onClick={() => setAns({ ...ans, [i]: j })} className={`p-3 rounded-lg border-2 cursor-pointer transition ${ans[i] === j ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:text-white'}`}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {quiz.length > 0 && score === null && (
                <button onClick={submit} className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition">Submit Quiz</button>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Quiz History</h3>
              <div className="space-y-2">
                {quizHistory.map((item) => (
                  <div key={item._id} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="font-semibold dark:text-white">{item.subject}</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">{item.score}/{item.total}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'classroom' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 dark:text-white">Classroom</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
              <div className="flex gap-3 mb-4">
                <input id="classCode" type="text" placeholder="Enter code" className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                <button onClick={() => joinClass(document.getElementById('classCode').value)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition">Join</button>
              </div>
              <button onClick={createClass} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition">Create</button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Your Classrooms</h3>
              <div className="space-y-3">
                {classrooms.map((room) => (
                  <div key={room._id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:translate-x-1 transition">
                    <div>
                      <h4 className="font-semibold dark:text-white">{room.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{room.members} members • Code: {room.code}</p>
                    </div>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition">Enter</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'leaderboard' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 dark:text-white">Leaderboard</h1>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-6">
              <div className="flex justify-center items-end gap-5 mb-8">
                <div className="text-center">
                  <div className="w-24 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded-t-lg flex flex-col items-center justify-center text-gray-800 hover:-translate-y-2 transition">
                    <div className="text-3xl mb-2">👩</div>
                    <div className="font-bold">Anjali</div>
                    <div className="text-sm">820 pts</div>
                  </div>
                  <div className="w-8 h-8 -mt-4 mx-auto bg-white rounded-full flex items-center justify-center font-bold shadow">2</div>
                </div>
                <div className="text-center">
                  <div className="w-24 h-40 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-t-lg flex flex-col items-center justify-center text-gray-800 hover:-translate-y-2 transition">
                    <div className="text-3xl mb-2">👨</div>
                    <div className="font-bold">Rahul</div>
                    <div className="text-sm">950 pts</div>
                  </div>
                  <div className="w-8 h-8 -mt-4 mx-auto bg-white rounded-full flex items-center justify-center font-bold shadow">1</div>
                </div>
                <div className="text-center">
                  <div className="w-24 h-28 bg-gradient-to-br from-orange-300 to-orange-500 rounded-t-lg flex flex-col items-center justify-center text-white hover:-translate-y-2 transition">
                    <div className="text-3xl mb-2">👤</div>
                    <div className="font-bold">You</div>
                    <div className="text-sm">750 pts</div>
                  </div>
                  <div className="w-8 h-8 -mt-4 mx-auto bg-white rounded-full flex items-center justify-center font-bold shadow">3</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Rankings</h3>
              <div className="space-y-2">
                {[
                  { rank: 1, name: 'Rahul Kumar', score: 950, highlight: true },
                  { rank: 2, name: 'Anjali Sharma', score: 820 },
                  { rank: 3, name: 'You', score: 750, you: true },
                  { rank: 4, name: 'Priya Singh', score: 680 },
                  { rank: 5, name: 'Arjun Patel', score: 620 }
                ].map((item) => (
                  <div
                    key={item.rank}
                    className={`flex items-center gap-5 p-3 rounded-lg hover:translate-x-1 transition ${
                      item.you
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-600'
                        : item.highlight
                        ? 'bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500'
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <span className="font-bold text-lg w-8 dark:text-white">{item.rank}</span>
                    <span className="flex-1 font-semibold dark:text-white">{item.name}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'timer' && (
          <div>
            <h1 className="text-3xl font-bold mb-8 dark:text-white">Timer</h1>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow text-center mb-6">
              <div className="text-7xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 font-mono">{fmt(time)}</div>
              <div className="text-gray-500 dark:text-gray-400 mb-6">{running ? 'Focus Time' : 'Paused'}</div>
              <div className="flex justify-center gap-3 mb-6">
                <button onClick={() => setRunning(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition">Start</button>
                <button onClick={() => setRunning(false)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition">Pause</button>
                <button onClick={() => { setTime(1500); setRunning(false) }} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition">Reset</button>
              </div>
              <div className="flex justify-center gap-3">
                {[25, 45, 60].map(m => (
                  <button key={m} onClick={() => { setTime(m * 60); setRunning(false) }} className="px-5 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition dark:text-white">{m}m</button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Today</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">2h 30m</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Study Time</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">4</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sessions Completed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 right-8 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-6 py-3 rounded-lg shadow-lg border-l-4 border-green-500 animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
