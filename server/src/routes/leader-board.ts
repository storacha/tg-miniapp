import type { Request, Response } from 'express'
import { Router } from 'express'

const router = Router()

router.get('/leaderboards', async (req: Request, res: Response) => {
	// TODO: Get all chats from telegram
	res.status(200).send({ message: 'OK' })
})

router.get('/user-point', async (req: Request, res: Response) => {
	// TODO: validate bot basher and create account in strocha if not otherwise logged in with strocha store stocha session in db
	res.status(200).send({ message: 'OK' })
})

export default router
