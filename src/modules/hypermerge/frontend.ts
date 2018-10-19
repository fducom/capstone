import { EventEmitter } from "events"
import { Patch, Doc, ChangeFn } from "automerge/frontend"
import * as Frontend from "automerge/frontend"
import Queue from "../../data/Queue"
import * as Debug from "debug"

const log = Debug("hypermerge:front")

export type Patch = Patch

type Mode = "pending" | "read" | "write"

export class FrontendHandle<T> extends EventEmitter {
  docId: string
  actorId?: string
  back?: any // place to put the backend if need be - not needed here int he code so didnt want to import
  private changeQ: Queue<ChangeFn<T>> = new Queue()
  private front: Doc<T>
  private mode: Mode = "pending"

  constructor(docId: string, actorId?: string) {
    super()

    if (actorId) {
      this.front = Frontend.init(actorId) as Doc<T>
      this.docId = docId
      this.actorId = actorId
      this.enableWrites()
    } else {
      this.front = Frontend.init({ deferActorId: true }) as Doc<T>
      this.docId = docId
    }

    this.on("newListener", (event, listener) => {
      if (event === "doc" && this.mode != "pending") {
        listener(this.front)
      }
    })
  }

  change = (fn: ChangeFn<T>) => {
    log("change", this.docId)
    if (!this.actorId) {
      log("change needsActorId", this.docId)
      this.emit("needsActorId")
    }
    this.changeQ.push(fn)
  }

  release = () => {
    this.removeAllListeners()
  }

  setActorId = (actorId: string) => {
    log("setActorId", this.docId, actorId, this.mode)
    this.actorId = actorId
    this.front = Frontend.setActorId(this.front, actorId)

    if (this.mode === "read") this.enableWrites() // has to be after the queue
  }

  init = (actorId?: string, patch?: Patch) => {
    log(`init docid=${this.docId} actorId=${actorId} patch=${!!patch} mode=${this.mode}`)

    if (this.mode !== "pending") return

    if (actorId) this.setActorId(actorId) // must set before patch

    if (patch) this.patch(patch) // first patch!

    this.mode = "read"

    if (actorId) this.enableWrites() // must enable after patch
  }

  private enableWrites() {
    this.mode = "write"
    this.changeQ.subscribe(fn => {
      const doc = Frontend.change(this.front, fn)
      const requests = Frontend.getRequests(doc)
      this.front = doc
      log("change complete", this.docId, this.front)
      this.emit("doc", this.front)
      this.emit("requests", requests)
    })
  }

  patch = (patch: Patch) => {
    this.bench("patch",() => {
      this.front = Frontend.applyPatch(this.front, patch)
      if (patch.diffs.length > 0) {
        this.emit("doc", this.front)
      }
    })
  }

  bench(msg: string, f: () => void) : void {
    const start = Date.now()
    f()
    const duration = Date.now() - start
    log(`docId=${this.docId} task=${msg} time=${duration}ms`)
  }
}
