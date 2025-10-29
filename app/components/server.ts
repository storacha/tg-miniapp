'use server'

import { CreateJobRequest, Job } from '@/api'
import { telegramLogout } from '@/lib/server/telegram'
import { toResultFn } from '@/lib/errorhandling'
import { queueFn } from '@/lib/server/queue'

import {
  storeInitData as jobsStoreInitData,
  login as jobsLoginJob,
  createJob as jobsCreateJob,
  findJob as jobsFindJob,
  listJobs as jobsListJob,
  removeJob as jobsRemoveJob,
  cancelJob as jobsCancelJob,
  deleteDialogFromJob as jobsDeleteDialogFromJob,
} from '@/lib/server/jobs'
import { clearAuthSession } from '@/lib/server/session'

export const login = toResultFn(jobsLoginJob)
export const storeInitData = toResultFn(jobsStoreInitData)
export const createJob = toResultFn(
  async (jr: CreateJobRequest): Promise<Job> => jobsCreateJob(jr, queueFn)
)
export const findJob = toResultFn(jobsFindJob) // TODO: remove it
export const listJobs = toResultFn(jobsListJob) // TODO: remove it
export const removeJob = toResultFn(jobsRemoveJob)
export const cancelJob = toResultFn(jobsCancelJob)
export const deleteDialogFromJob = toResultFn(jobsDeleteDialogFromJob)

export const logout = toResultFn(async (sessionString: string) => {
  // Clear iron session first
  clearAuthSession()
  // Then logout from Telegram
  await telegramLogout(sessionString)
})
