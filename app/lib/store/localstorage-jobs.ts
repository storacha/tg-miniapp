import { Job, JobID, JobStorage } from '@/api'
import * as dagJSON from '@ipld/dag-json'

export const create = (): JobStorage => new Store()

class Store extends EventTarget {
  async find (id: JobID) {
    return find(id)
  }

  async list () {
    return list()
  }

  async add (job: Job) {
    add(this, job)
  }

  async update (id: JobID, data: Partial<Omit<Job, 'id'>>) {
    update(this, id, data)
  }

  async remove (id: JobID) {
    remove(this, id)
  }
}

export const find = (id: JobID) => {
  const str = localStorage.getItem(`job:${id}`)
  if (str == null) return null
  const data: Job & { dialogs: string[] } = dagJSON.parse(str)
  return {
    ...data,
    dialogs: new Set(data.dialogs.map(v => BigInt(v)))
  }
}

export const list = () => {
  const str = localStorage.getItem('jobs')
  if (str == null) return { items: [] }
  const data: string[] = dagJSON.parse(str)
  return { items: data.map(id => find(id)).filter(j => j != null) }
}

export const add = (target: EventTarget, job: Job) => {
  localStorage.setItem(`job:${job.id}`, dagJSON.format({
    ...job,
    dialogs: [...job.dialogs].map(id => id.toString())
  }))
  const jobIDs: string[] = dagJSON.parse(localStorage.getItem('jobs') ?? '[]')
  localStorage.setItem('jobs', dagJSON.stringify([job.id, ...jobIDs]))
  target.dispatchEvent(new CustomEvent('add', { detail: job }))
}

export const update = (target: EventTarget, id: JobID, data: Partial<Omit<Job, 'id'>>) => {
  const job = find(id)
  if (!job) throw new Error(`job not found: ${id}`)
  const update = {
    ...job,
    ...data,
    dialogs: [...(data.dialogs ?? job.dialogs)].map(id => id.toString())
  }
  localStorage.setItem(`job:${job.id}`, dagJSON.format(update))
  target.dispatchEvent(new CustomEvent('update', { detail: update }))
}

export const remove = (target: EventTarget, id: JobID) => {
  const job = find(id)
  if (!job) throw new Error(`job not found: ${id}`)
  localStorage.removeItem(`job:${id}`)
  const jobIDs: string[] = dagJSON.parse(localStorage.getItem('jobs') ?? '[]')
  console.log(jobIDs)
  localStorage.setItem('jobs', dagJSON.stringify(jobIDs.filter(jid => jid !== id)))
  console.log(dagJSON.stringify(jobIDs.filter(jid => jid !== id)))
  target.dispatchEvent(new CustomEvent('remove', { detail: job }))
}
