import type { Request, Response } from 'express'
import { Router } from 'express'

const router = Router()

router.get('/tg-chats', async (req: Request, res: Response) => {
	// TODO: Get all chats from telegram
	res.status(200).send({ message: 'OK' })
})

export default router
