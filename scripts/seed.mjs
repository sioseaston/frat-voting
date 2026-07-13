import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Set MONGODB_URI before running npm run seed.')
  process.exit(1)
}

await mongoose.connect(uri, { dbName: 'fraternity-voting' })

const User = mongoose.model(
  'User',
  new mongoose.Schema(
    {
      membershipNumber: String,
      fullname: String,
      email: String,
      password: String,
      role: String,
      status: String,
      hasVoted: Boolean,
    },
    { timestamps: true },
  ),
)
const Election = mongoose.model(
  'Election',
  new mongoose.Schema(
    { title: String, description: String, startDate: Date, endDate: Date, status: String },
    { timestamps: true },
  ),
)
const Position = mongoose.model(
  'Position',
  new mongoose.Schema(
    { electionId: mongoose.Schema.Types.ObjectId, name: String, order: Number },
    { timestamps: true },
  ),
)
const Candidate = mongoose.model(
  'Candidate',
  new mongoose.Schema(
    {
      electionId: mongoose.Schema.Types.ObjectId,
      positionId: mongoose.Schema.Types.ObjectId,
      fullname: String,
      photo: String,
      platform: String,
      biography: String,
    },
    { timestamps: true },
  ),
)

await Promise.all([User.deleteMany({}), Election.deleteMany({}), Position.deleteMany({}), Candidate.deleteMany({})])

const password = await bcrypt.hash('Admin123!', 12)
await User.create([
  {
    membershipNumber: 'ADM-001',
    fullname: 'Chapter Administrator',
    email: 'admin@fraternity.test',
    password,
    role: 'admin',
    status: 'active',
    hasVoted: false,
  },
  {
    membershipNumber: 'MEM-001',
    fullname: 'Miguel Santos',
    email: 'miguel@fraternity.test',
    password,
    role: 'member',
    status: 'active',
    hasVoted: false,
  },
  {
    membershipNumber: 'MEM-002',
    fullname: 'Rafael Cruz',
    email: 'rafael@fraternity.test',
    password,
    role: 'member',
    status: 'active',
    hasVoted: false,
  },
])

const election = await Election.create({
  title: '2026 Chapter Officers Election',
  description: 'Annual election for the fraternity executive officers.',
  startDate: new Date(Date.now() - 60 * 60 * 1000),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'open',
})

const positions = await Position.create([
  { electionId: election._id, name: 'President', order: 1 },
  { electionId: election._id, name: 'Vice President', order: 2 },
  { electionId: election._id, name: 'Secretary', order: 3 },
])

await Candidate.create([
  {
    electionId: election._id,
    positionId: positions[0]._id,
    fullname: 'John Doe',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    platform: 'Transparent service and stronger alumni engagement.',
    biography: 'A senior member focused on accountable chapter leadership.',
  },
  {
    electionId: election._id,
    positionId: positions[0]._id,
    fullname: 'Michael Cruz',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    platform: 'Member-first programs and modernized operations.',
    biography: 'Former committee lead with experience coordinating chapter events.',
  },
  {
    electionId: election._id,
    positionId: positions[1]._id,
    fullname: 'Jane Smith',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    platform: 'Mentorship, service, and reliable internal communications.',
    biography: 'Known for building productive committees and inclusive programs.',
  },
  {
    electionId: election._id,
    positionId: positions[1]._id,
    fullname: 'Carlos Reyes',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    platform: 'Operational discipline and chapter-wide participation.',
    biography: 'Active organizer with a practical approach to chapter governance.',
  },
  {
    electionId: election._id,
    positionId: positions[2]._id,
    fullname: 'Adrian Lim',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    platform: 'Accurate records and faster member updates.',
    biography: 'Detail-oriented member with experience managing documentation.',
  },
])

console.log('Seed complete.')
await mongoose.disconnect()
