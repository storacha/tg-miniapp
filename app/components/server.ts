'use server'

import { create as createJobServer } from '@/lib/server/server'
import Queue from 'p-queue'
import { JobRequest } from '@/api'

//TODO replace with actual server action
  const queue = new Queue({concurrency: 1})
  const server = await createJobServer({
    queueFn: (jr: JobRequest) => {
      return queue.add(async () => {
        await server.handleJob(jr)
      })
    }
  })
export const sendRequest = async (jr: JobRequest) => server.queueJob(jr)
// end TODO