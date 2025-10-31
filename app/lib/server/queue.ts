import { after } from 'next/server'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { stringifyWithUIntArrays } from '@/lib/utils'
import { ExecuteJobRequest } from '@/api'
import { Consumer } from 'sqs-consumer'
import PQueue from 'p-queue'
import { handleJob } from './jobs'
import { parseWithUIntArrays } from '@/lib/utils'

const queueURL = process.env.JOBS_QUEUE_ID

const localQueueFn = () => {
  console.debug('creating message for local queue...')
  return async (jr: ExecuteJobRequest) => {
    after(async () => {
      console.log('initiate job', jr.jobID)
      fetch(process.env.LOCAL_URL + '/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ body: stringifyWithUIntArrays(jr) }),
      })
    })
  }
}

const sqsQueueFn = () => {
  console.debug('creating message for sqs queue id: ', queueURL)
  const client = new SQSClient({})

  return async (jr: ExecuteJobRequest) => {
    const command = new SendMessageCommand({
      QueueUrl: queueURL,
      MessageBody: stringifyWithUIntArrays(jr),
    })
    const result = await client.send(command)
    console.log('SQS message sent successfully:', result.MessageId)
  }
}

export const queueFn = queueURL ? sqsQueueFn() : localQueueFn()

const PARALLEL_JOBS = parseInt(process.env.PARALLEL_JOBS || '3', 10)

let queueStarted = false
const startQueueConsumer = async () => {
  if (!queueURL) {
    return
  }
  if (queueStarted) {
    return
  }
  const queue = new PQueue({ concurrency: PARALLEL_JOBS })
  const consumer = new Consumer({
    queueUrl: queueURL,
    handleMessage: async (message) => {
      queue.add(
        async () =>
          await handleJob(
            parseWithUIntArrays(message.Body || '') as ExecuteJobRequest
          )
      )
      // wait for all queued jobs to be processing before returning
      await queue.onEmpty()
      return message
    },
    sqs: new SQSClient({}),
  })
  consumer.start()
  console.log('SQS Consumer started for queue:', queueURL)
  queueStarted = true
}

await startQueueConsumer()
