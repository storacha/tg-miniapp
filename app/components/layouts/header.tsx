import { MoveLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Menu } from './menu'

export function Header({
  isSinglePage = false,
  back,
}: {
  isSinglePage?: boolean
  back?: () => void
}) {
  const { back: goBack } = useRouter()
  return (
    <header className="flex justify-between items-center p-5 sticky top-0">
      {isSinglePage ? (
        <button type="button" onClick={back || goBack}>
          <MoveLeft />
        </button>
      ) : (
        <h1 className="text-primary font-semibold text-xl">Storacha</h1>
      )}

      <Menu />
    </header>
  )
}
