import { Menu } from './menu'

export function Header() {
	return (
		<header className="flex justify-between items-center p-5">
			<h1 className="text-primary font-semibold text-xl">Storacha</h1>
			<Menu />
		</header>
	)
}
