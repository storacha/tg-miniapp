import type { Request, Response } from 'express'
import { Router } from 'express'

const router = Router()

router.get('/backups', async (req: Request, res: Response) => {
	// TODO: before backup check strocha is logged in or not
	// TODO: Get all backups from strocha  and decode with secrets and return
	res.status(200).send({ message: 'OK' })
})

router.post('/create-backup', async (req: Request, res: Response) => {
	// TODO: upload backup from strocha and  encrypt backup from  app secrets maintain in db
	// TODO: also update points in leaderboards
	res.status(200).send({ message: 'OK' })
})

export default router
