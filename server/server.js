import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
app.use(cors())
app.use(express.json())

const JWT_SECRET = 'your-secret-key-change-in-production'

// MongoDB connection with error handling
mongoose.connect('mongodb://localhost:27017/exambuddy')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err))

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now }
})

const noteSchema = new mongoose.Schema({
  userId: String,
  name: String,
  content: String,
  summary: String,
  date: { type: Date, default: Date.now }
})

const quizSchema = new mongoose.Schema({
  userId: String,
  score: Number,
  total: Number,
  subject: String,
  date: { type: Date, default: Date.now }
})

const classroomSchema = new mongoose.Schema({
  name: String,
  code: String,
  members: { type: Number, default: 1 }
})

const User = mongoose.model('User', userSchema)
const Note = mongoose.model('Note', noteSchema)
const Quiz = mongoose.model('Quiz', quizSchema)
const Classroom = mongoose.model('Classroom', classroomSchema)

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error()
    const decoded = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Please authenticate' })
  }
}

// Auth routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ error: 'Email already exists' })
    
    const hashedPassword = await bcrypt.hash(password, 8)
    const user = new User({ name, email, password: hashedPassword })
    await user.save()
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET)
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })
    
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET)
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Notes API
app.get('/api/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ date: -1 })
    res.json(notes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/notes', auth, async (req, res) => {
  try {
    const note = new Note({ ...req.body, userId: req.userId })
    await note.save()
    res.json(note)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Quiz API
app.get('/api/quizzes', auth, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.userId }).sort({ date: -1 }).limit(10)
    res.json(quizzes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/quizzes', auth, async (req, res) => {
  try {
    const quiz = new Quiz({ ...req.body, userId: req.userId })
    await quiz.save()
    res.json(quiz)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Classroom API
app.get('/api/classrooms', async (req, res) => {
  try {
    const classrooms = await Classroom.find()
    res.json(classrooms)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/classrooms', async (req, res) => {
  try {
    const classroom = new Classroom({
      ...req.body,
      code: Math.random().toString(36).substring(2, 8).toUpperCase()
    })
    await classroom.save()
    res.json(classroom)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/classrooms/join', async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ code: req.body.code })
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' })
    
    classroom.members += 1
    await classroom.save()
    res.json(classroom)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Stats API
app.get('/api/stats', auth, async (req, res) => {
  try {
    const noteCount = await Note.countDocuments({ userId: req.userId })
    const quizCount = await Quiz.countDocuments({ userId: req.userId })
    const avgScore = await Quiz.aggregate([
      { $match: { userId: req.userId } },
      { $group: { _id: null, avg: { $avg: '$score' } } }
    ])
    
    res.json({
      notes: noteCount,
      quizzes: quizCount,
      avgScore: avgScore[0]?.avg || 0
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => console.log('Server running on http://localhost:3000'))
