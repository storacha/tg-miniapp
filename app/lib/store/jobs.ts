import { Job, JobID, JobStorage, ObjectStorage } from '@/api'

export interface Init {
  store: ObjectStorage<Record<JobID, Job>>
}

export interface Context {
  target: EventTarget
  store: ObjectStorage<Record<JobID, Job>>
}

/** Create a new job storage, initializing it if empty. */
export const create = async (init: Init): Promise<JobStorage> => {
  const store = new Store(init)
  try {
    const jobs = await init.store.get()
    console.log(`found ${Object.keys(jobs).length} existing jobs`)
  } catch (err) {
    console.error(err) // TODO: what is the error that requires init
    console.log('initializing store')
    await init.store.init({})
  }
  return store
}

class Store extends EventTarget implements JobStorage {
  public store
  public target

  constructor ({ store }: Init) {
    super()
    this.target = this
    this.store = store
  }

  async find (id: JobID) {
    return find(this, id)
  }

  async listPending () {
    return listPending(this)
  }

  async listCompleted () {
    return listCompleted(this)
  }

  async add (job: Job) {
    add(this, job)
  }

  async replace (data: Job) {
    replace(this, data)
  }

  async remove (id: JobID) {
    remove(this, id)
  }
}

export const find = async ({ store }: Context, id: JobID) => {
  const jobs = await store.get()
  return jobs[id] ?? null
}

export const list = async ({ store }: Context) => {
  const jobs = await store.get()
  return { items: Object.values(jobs) }
}

export const listPending = async (ctx: Context) => {
  const jobs = []
  const page = await list(ctx)
  for (const j of page.items) {
    if (j.status === 'waiting' || j.status === 'queued' || j.status === 'running' || j.status === 'failed') {
      jobs.push(j)
    }
  }
  return { items: jobs }
}

export const listCompleted = async (ctx: Context) => {
  const jobs = []
  const page = await list(ctx)
  for (const j of page.items) {
    if (j.status === 'completed') {
      jobs.push(j)
    }
  }
  return { items: jobs }
}

export const add = async ({ store, target }: Context, job: Job) => {
  const jobs = await store.get()
  jobs[job.id] = job
  await store.set(jobs)
  target.dispatchEvent(new CustomEvent('add', { detail: job }))
}

export const replace = async ({ store, target }: Context, job: Job) => {
  const jobs = await store.get()
  if (!jobs[job.id]) throw new Error(`job not found: ${job.id}`)
  jobs[job.id] = job
  await store.set(jobs)
  target.dispatchEvent(new CustomEvent('replace', { detail: job }))
}

export const remove = async ({ store, target }: Context, id: JobID) => {
  const jobs = await store.get()
  const job = jobs[id]
  if (!job) throw new Error(`job not found: ${id}`)
  delete jobs[id]
  await store.set(jobs)
  target.dispatchEvent(new CustomEvent('remove', { detail: job }))
}
