import type { Request, Response } from 'express'
import { Router } from 'express'

const router = Router()

router.get('/user', async (req: Request, res: Response) => {
	// TODO: Create Account in data base and return the user with jwt token also generate backup secret key
	// {name:"", username:"telegram_username", id: 123456789, isStorrchalogged, isTelegramLogged, strocha_session: "strocha_session", telegram_session: "telegram_session"}
	res.status(200).send({ message: 'OK' })
})

router.post('/auth-init', async (req: Request, res: Response) => {
	// TODO: Create Account in data base and return the user with jwt token also generate backup secret key
	res.status(200).send({ message: 'OK' })
})

router.post('/request-tg-session', async (req: Request, res: Response) => {
	// TODO: Request tg session from telegram and return bool
	res.status(200).send({ message: 'OK' })
})

router.post('/validate-tg-session', async (req: Request, res: Response) => {
	// TODO: Validate Tg session with otp and return user that have session loggedIn
	res.status(200).send({ message: 'OK' })
})

export default router
