const user = {
	id: 1,
	name: 'John Doe',
	email: 'john@gmal.com',
}

export function authInitTelegram() {
	new Promise((resolve, reject) => {
		resolve({ user, jwtToken: 'jbfwkjbwjfwebfkwjebfkwejb' })
	})
}
