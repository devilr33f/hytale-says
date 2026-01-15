import fs from 'node:fs/promises'

const STATE_FILE = './state.json'
const DEBOUNCE_MS = 5000

export class StateStore {
  private state = new Map<string, unknown>()
  private dirty = new Set<string>()
  private persistTimer: NodeJS.Timeout | null = null
  private loaded = false

  async load(): Promise<void> {
    if (this.loaded) {
      return
    }

    try {
      const content = await fs.readFile(STATE_FILE, 'utf-8')
      const data = JSON.parse(content) as Record<string, unknown>

      for (const [key, value] of Object.entries(data)) {
        this.state.set(key, value)
      }
    }
    catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('[StateStore] Failed to load state file:', err)
      }
    }

    this.loaded = true
  }

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T
  }

  set<T>(key: string, value: T): void {
    this.state.set(key, value)
    this.dirty.add(key)
    this.schedulePersist()
  }

  private schedulePersist(): void {
    if (this.persistTimer) {
      return
    }

    this.persistTimer = setTimeout(() => {
      this.persist().catch((err) => {
        console.error('[StateStore] Failed to persist state:', err)
      })
    }, DEBOUNCE_MS)
  }

  private async persist(): Promise<void> {
    this.persistTimer = null

    if (this.dirty.size === 0) {
      return
    }

    const toSave: Record<string, unknown> = {}
    for (const key of this.dirty) {
      toSave[key] = this.state.get(key)
    }

    try {
      await fs.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2))
      this.dirty.clear()
    }
    catch (err) {
      console.error('[StateStore] Failed to write state file:', err)
    }
  }

  async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    await this.persist()
  }
}
