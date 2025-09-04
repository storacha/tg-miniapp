import { after } from 'next/server'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { stringifyWithUIntArrays } from '@/lib/utils'
import { ExecuteJobRequest } from '@/api'

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
