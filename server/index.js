import express from 'express'
import cors from 'cors'
import authRouter from './auth.js'
import workoutsRouter from './workouts.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/api/auth', authRouter)
app.use('/api/workouts', workoutsRouter)

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
