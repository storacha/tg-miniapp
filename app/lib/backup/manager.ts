import { AbsolutePeriod, BackupStorage, JobID, JobStorage, Period } from '@/api'
import { SpaceDID, Client as StorachaClient } from '@storacha/ui-react'
import { TelegramClient } from '@/vendor/telegram'
import Queue from 'p-queue'
import * as Runner from './runner'
import { Context as RunnerContext } from './runner'


export interface Context extends RunnerContext {
  jobs: JobStorage
  backups: BackupStorage
}

export const create = (ctx: Context) => new JobManager(ctx)

class JobManager {
  storacha
  telegram
  encryptionPassword

  #jobs
  #backups
  #queue

  constructor ({ storacha, telegram, encryptionPassword, jobs, backups }: Context) {
    this.storacha = storacha
    this.telegram = telegram
    this.encryptionPassword = encryptionPassword
    this.#jobs = jobs
    this.#backups = backups
    this.#queue = new Queue({ concurrency: 1 })
  }

  async add (space: SpaceDID, dialogs: Set<bigint>, period: Period) {
    const id = self.crypto.randomUUID()
    const absPeriod: AbsolutePeriod = [period[0], period[1] ?? Date.now() / 1000]

    await this.#jobs.add({
      id,
      state: 'queued',
      progress: 0,
      space,
      dialogs,
      period: absPeriod
    })

    this.#queue.add(async () => {
      try {
        await this.#jobs.update(id, { state: 'running', error: '' })

        let dialogsCompleted = 0
        const data = await Runner.run(this, space, dialogs, absPeriod, {
          onDialogStored: async () => {
            console.log('dialog was stored!')
            dialogsCompleted++
            try {
              await this.#jobs.update(id, { progress: dialogsCompleted / dialogs.size })
            } catch (err) {
              console.error(err)
            }
          }
        })
        console.log('manager saw job complete')

        await this.#jobs.update(id, { progress: 1 })
        await this.#backups.add({ data, dialogs, period: absPeriod, created: Date.now() })
        console.log('manager added backup')
        await this.#jobs.remove(id)
      } catch (err: any) {
        console.error('backup failed', err)
        await this.#jobs.update(id, { state: 'failed', error: err.message })
      }
    })

    return id
  }

  async restart (id: JobID) {
    const job = await this.#jobs.find(id)
    if (!job) throw new Error(`job not found: ${id}`)
    await this.#jobs.update(id, { state: 'queued', progress: 0, error: '' })
    
    this.#queue.add(async () => {
      try {
        await this.#jobs.update(id, { state: 'running', error: '' })

        let dialogsCompleted = 0
        const data = await Runner.run(this, job.space, job.dialogs, job.period, {
          onDialogStored: async () => {
            console.log('dialog was stored!')
            dialogsCompleted++
            try {
              console.log({ progress: dialogsCompleted / job.dialogs.size })
              await this.#jobs.update(id, { progress: dialogsCompleted / job.dialogs.size })
            } catch (err) {
              console.error(err)
            }
          }
        })
        console.log('manager saw job complete')

        await this.#jobs.update(id, { progress: 1 })
        await this.#backups.add({ data, dialogs: job.dialogs, period: job.period, created: Date.now() })
        console.log('manager added backup')
        await this.#jobs.remove(id)
        console.log('manager removed job with ID', id)
      } catch (err: any) {
        console.error('backup failed', err)
        await this.#jobs.update(id, { state: 'failed', error: err.message })
      }
    })
  }
}
