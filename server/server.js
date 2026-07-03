import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const JWT_SECRET = process.env.JWT_SECRET || 'change-in-production'
const UPLOAD_DIR = path.join(__dirname, 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exambuddy')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err))

// Schemas
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
  fileUrl: String,
  fileSize: Number,
  fileType: String,
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

// Multer config — 50MB limit, allowed types
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|txt|png|jpg|jpeg|ppt|pptx|xlsx|xls/
    const ext = path.extname(file.originalname).toLowerCase().slice(1)
    allowed.test(ext) ? cb(null, true) : cb(new Error('File type not allowed'))
  }
})

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) throw new Error()
    req.userId = jwt.verify(token, JWT_SECRET).userId
    next()
  } catch {
    res.status(401).json({ error: 'Please authenticate' })
  }
}

// Auth routes
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already exists' })
    const user = new User({ name, email, password: await bcrypt.hash(password, 10) })
    await user.save()
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' })
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// File upload endpoint
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.json({
    fileUrl: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  })
})

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 50MB allowed.' })
  }
  if (err) return res.status(400).json({ error: err.message })
  next()
})

// Notes API
app.get('/api/notes', auth, async (req, res) => {
  try {
    res.json(await Note.find({ userId: req.userId }).sort({ date: -1 }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/notes', auth, async (req, res) => {
  try {
    const note = await new Note({ ...req.body, userId: req.userId }).save()
    res.json(note)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/notes/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId })
    // Remove file from disk if exists
    if (note?.fileUrl) {
      const filePath = path.join(__dirname, note.fileUrl)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Quiz API
app.get('/api/quizzes', auth, async (req, res) => {
  try {
    res.json(await Quiz.find({ userId: req.userId }).sort({ date: -1 }).limit(20))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/quizzes', auth, async (req, res) => {
  try {
    res.json(await new Quiz({ ...req.body, userId: req.userId }).save())
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Classroom API
app.get('/api/classrooms', async (req, res) => {
  try {
    res.json(await Classroom.find())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/classrooms', async (req, res) => {
  try {
    const classroom = await new Classroom({
      ...req.body,
      code: Math.random().toString(36).substring(2, 8).toUpperCase()
    }).save()
    res.json(classroom)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/classrooms/join', async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ code: req.body.code.toUpperCase() })
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
    const [noteCount, quizCount, avgScore] = await Promise.all([
      Note.countDocuments({ userId: req.userId }),
      Quiz.countDocuments({ userId: req.userId }),
      Quiz.aggregate([
        { $match: { userId: req.userId } },
        { $group: { _id: null, avg: { $avg: { $divide: ['$score', '$total'] } } } }
      ])
    ])
    res.json({ notes: noteCount, quizzes: quizCount, avgScore: Math.round((avgScore[0]?.avg || 0) * 100) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(3000, () => console.log('Server running on http://localhost:3000'))
