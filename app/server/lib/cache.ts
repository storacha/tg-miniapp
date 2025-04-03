export async function getSession(userId: string): Promise<string | undefined> {
    return global.sessionCache.get(userId)
}

export async function setSession(userId: string, session: any){
    global.sessionCache.set(userId, session)
}