// Capa de acceso a Supabase para Gobernanza: sesiones/actas, votaciones y votos.
import { supabase } from '../lib/supabase'
import { Ballot, GovSession, SessionStatus, VoteStatus } from './governance'

// ---- Sesiones ----------------------------------------------------------------
type SessionRow = {
  id: string
  day: string | null
  month: string | null
  title: string
  detail: string | null
  organ: string | null
  status: SessionStatus
  minutes: string | null
  asistentes: number | null
  quorum: boolean | null
}

function rowToSession(r: SessionRow): GovSession {
  return {
    id: r.id,
    day: r.day ?? '',
    month: r.month ?? '',
    title: r.title,
    detail: r.detail ?? '',
    organ: r.organ ?? '',
    status: r.status,
    minutes: r.minutes ?? undefined,
    asistentes: r.asistentes ?? undefined,
    quorum: r.quorum ?? undefined,
  }
}

function sessionToRow(s: Partial<GovSession>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('day', s.day); set('month', s.month); set('title', s.title); set('detail', s.detail)
  set('organ', s.organ); set('status', s.status); set('minutes', s.minutes)
  set('asistentes', s.asistentes); set('quorum', s.quorum)
  return row
}

export async function fetchSessions(): Promise<GovSession[]> {
  const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as SessionRow[]).map(rowToSession)
}

export async function insertSession(s: GovSession): Promise<GovSession> {
  const { data, error } = await supabase.from('sessions').insert(sessionToRow(s)).select().single()
  if (error) throw error
  return rowToSession(data as SessionRow)
}

export async function patchSession(id: string, changes: Partial<GovSession>): Promise<void> {
  const { error } = await supabase.from('sessions').update(sessionToRow(changes)).eq('id', id)
  if (error) throw error
}

export async function deleteSessionRow(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
}

// ---- Votaciones --------------------------------------------------------------
type BallotRow = {
  id: string
  title: string
  closes_at: string | null
  favor: number
  contra: number
  abstencion: number
  status: VoteStatus
  outcome: 'Aprobada' | 'Rechazada' | null
  secreta: boolean | null
}

function rowToBallot(r: BallotRow): Ballot {
  return {
    id: r.id,
    title: r.title,
    closesAt: r.closes_at ?? '',
    favor: r.favor,
    contra: r.contra,
    abstencion: r.abstencion,
    status: r.status,
    outcome: r.outcome ?? undefined,
    secreta: r.secreta ?? false,
  }
}

export async function fetchBallots(): Promise<Ballot[]> {
  const { data, error } = await supabase.from('ballots').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as BallotRow[]).map(rowToBallot)
}

export async function insertBallot(b: { title: string; closesAt: string; secreta?: boolean }): Promise<Ballot> {
  const { data, error } = await supabase.from('ballots')
    .insert({ title: b.title, closes_at: b.closesAt, secreta: !!b.secreta })
    .select().single()
  if (error) throw error
  return rowToBallot(data as BallotRow)
}

export async function patchBallot(id: string, changes: Partial<Ballot>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (changes.status !== undefined) row.status = changes.status
  if (changes.outcome !== undefined) row.outcome = changes.outcome
  const { error } = await supabase.from('ballots').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteBallotRow(id: string): Promise<void> {
  const { error } = await supabase.from('ballots').delete().eq('id', id)
  if (error) throw error
}

// Emite el voto del usuario autenticado (una vez por votación). Devuelve true si
// se contabilizó, false si ya había votado o la votación está cerrada.
export async function emitirVoto(ballotId: string, choice: 'favor' | 'contra' | 'abstencion'): Promise<boolean> {
  const { data, error } = await supabase.rpc('emitir_voto', { p_ballot: ballotId, p_choice: choice })
  if (error) throw error
  return data === true
}

// Ids de votaciones en las que el usuario ya votó.
export async function fetchMyVotes(): Promise<string[]> {
  const { data, error } = await supabase.from('votes').select('ballot_id')
  if (error) throw error
  return (data as Array<{ ballot_id: string }>).map((v) => v.ballot_id)
}
