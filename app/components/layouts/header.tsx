import { Menu } from './menu'

export function Header() {
	return (
		<header className="flex justify-between items-center py-5 px-5">
			<h1>Header</h1>
			<div>Logo</div>
			<Menu />
		</header>
	)
}
