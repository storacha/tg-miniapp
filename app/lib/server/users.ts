import { TelegramClient } from 'telegram'
import { SpaceDID } from '@storacha/access'
import { LeaderboardUser, Ranking } from '@/api'
import { getDB } from './db'
import { getInitials } from '../utils'
import { _getMe, withClient } from './telegram'
import supervillains from '@/lib/supervillains.json'

const names = supervillains
  .map((value) => ({ value, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ value }) => value)

export const getLeaderboardWithRanking = withClient(
  async (
    client: TelegramClient,
    space?: SpaceDID
  ): Promise<{ leaderboard: LeaderboardUser[]; ranking?: Ranking }> => {
    const me = await client.getMe()
    const myTelegramId = me?.id?.toString()

    const { leaderboard: dbUsers, ranking } = await getDB().leaderboard(
      myTelegramId,
      space
    )

    const leaderboard: LeaderboardUser[] = []
    let nameIndex = 0

    for (let i = 0; i < dbUsers.length; i++) {
      const id = dbUsers[i].telegramId
      let name
      if (id === myTelegramId) {
        const tgUser = me
        name =
          [tgUser.firstName, tgUser.lastName].filter((s) => !!s).join(' ') ||
          tgUser.username ||
          ''
      }
      if (!name) {
        name = names[nameIndex]
        nameIndex++
      }

      leaderboard.push({
        id,
        name,
        initials: getInitials(name),
        points: dbUsers[i].points,
        isMe: id === myTelegramId,
      })
    }
    return { leaderboard, ranking }
  }
)

export const getRanking = withClient(
  async (
    client: TelegramClient,
    space: SpaceDID
  ): Promise<Ranking | undefined> => {
    const id = await _getMe(client)
    return await getDB().rank({ telegramId: id, storachaSpace: space })
  }
)
