import fs from 'node:fs/promises'

const STATE_FILE = './state.json'
const DEBOUNCE_MS = 5000

export class StateStore {
  private state = new Map<string, unknown>()
  private dirty = new Set<string>()
  private persistTimer: NodeJS.Timeout | null = null
  private loaded = false
  private writeInProgress = false
  private pendingWrite = false

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
      this.writeInProgress = false
      return
    }

    if (this.writeInProgress) {
      this.pendingWrite = true
      return
    }

    this.writeInProgress = true

    // Write full state, not just dirty keys (atomicity)
    const toSave: Record<string, unknown> = {}
    for (const [key, value] of this.state.entries()) {
      toSave[key] = value
    }

    const retries = 3
    const backoffMs = [100, 300, 500]

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Direct write without temp file (Windows EBUSY workaround)
        await fs.writeFile(STATE_FILE, JSON.stringify(toSave, null, 2))
        this.dirty.clear()
        break
      }
      catch (err) {
        const error = err as NodeJS.ErrnoException
        if (error.code === 'EBUSY' && attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, backoffMs[attempt]))
          continue
        }
        console.error('[StateStore] Failed to write state file:', err)
      }
    }

    this.writeInProgress = false

    if (this.pendingWrite) {
      this.pendingWrite = false
      await this.persist()
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
