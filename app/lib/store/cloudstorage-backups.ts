import { cloudStorage } from '@telegram-apps/sdk-react'
import * as dagJSON from '@ipld/dag-json'
import { Backup, BackupStorage } from '@/api'
import { Link } from 'multiformats'


export const create = (): BackupStorage => new Store()

class Store extends EventTarget {
  list () {
    return list()
  }

  add (backup: Backup) {
    return add(this, backup)
  }

  clear () {
    return clear(this)
  }
}

export const list = async () => {
  const str = await cloudStorage.getItem('backups')
  if (str === '') return { items: [] }
  const ids: Link[] = dagJSON.parse(str)
  const backups: Backup[] = []
  for (const id of ids) {
    const str = await cloudStorage.getItem(`backup-${id}`)
    if (str === '') continue
    const data: Backup & { dialogs: string[] } = dagJSON.parse(str)
    backups.push({
      ...data,
      dialogs: new Set(data.dialogs.map(id => BigInt(id)))
    })
  }
  return { items: backups }
}

export const add = async (target: EventTarget, backup: Backup) => {
  await cloudStorage.setItem(`backup-${backup.data}`, dagJSON.stringify({
    ...backup,
    dialogs: [...backup.dialogs].map(id => id.toString())
  }))
  const str = await cloudStorage.getItem('backups') || '[]'
  const ids: Link[] = dagJSON.parse(str)
  await cloudStorage.setItem('backups', dagJSON.stringify([...ids, backup.data]))
  target.dispatchEvent(new CustomEvent('add', { detail: backup }))
}

export const clear = async (target: EventTarget) => {
  const str = await cloudStorage.getItem('backups')
  if (str === '') return
  const ids: Link[] = dagJSON.parse(str)
  await cloudStorage.deleteItem(['backups', ...ids.map(id => `backup-${id}`)])
  target.dispatchEvent(new CustomEvent('clear'))
}
