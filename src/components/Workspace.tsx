import * as Preact from "preact"
import * as Widget from "./Widget"
import * as Reify from "../data/Reify"
import * as Link from "../data/Link"
import { AnyDoc } from "automerge/frontend"
import Content, {
  DocumentActor,
  FullyFormedMessage,
  DocumentCreated,
} from "./Content"
import Clipboard from "./Clipboard"
import Touch, { TouchEvent } from "./Touch"
import { DocumentSelected, ClearSelection } from "./Archive"
import { AddToShelf, ShelfContentsRequested, SendShelfContents } from "./Shelf"

export interface Model {
  navStack: string[]
  archiveUrl: string
  shelfUrl: string
}

type WidgetMessage = DocumentCreated
type InMessage = FullyFormedMessage<
  DocumentCreated | DocumentSelected | AddToShelf | ShelfContentsRequested
>
type OutMessage =
  | DocumentCreated
  | AddToShelf
  | SendShelfContents
  | ClearSelection

class WorkspaceActor extends DocumentActor<Model, InMessage, OutMessage> {
  async onMessage(message: InMessage) {
    switch (message.type) {
      case "DocumentCreated": {
        if (message.from !== this.doc.archiveUrl) {
          this.emit({ ...message, to: this.doc.archiveUrl })
        }
        break
      }
      case "DocumentSelected": {
        // Clear the navstack and push selected document url.
        const { url } = message.body
        if (url !== this.doc.currentUrl) {
          this.change(doc => {
            doc.navStack = [url]
            return doc
          })
        }
        break
      }
      case "AddToShelf": {
        this.emit({
          type: "AddToShelf",
          body: message.body,
          to: this.doc.shelfUrl,
        })
        break
      }
      case "ShelfContentsRequested": {
        this.emit({
          type: "SendShelfContents",
          body: { recipientUrl: message.from, ...message.body },
          to: this.doc.shelfUrl,
        })
        this.emit({ type: "ClearSelection", to: this.doc.archiveUrl })
        break
      }
    }
  }
}

class Workspace extends Preact.Component<Widget.Props<Model, WidgetMessage>> {
  static reify(doc: AnyDoc): Model {
    return {
      navStack: Reify.array(doc.navStack),
      archiveUrl: Reify.link(doc.archiveUrl),
      shelfUrl: Reify.link(doc.shelfUrl),
    }
  }

  get isShowingArchive() {
    const { archiveUrl } = this.props.doc
    return this.currentUrl === archiveUrl
  }

  get currentUrl() {
    const { archiveUrl } = this.props.doc
    return this.peek() || archiveUrl
  }

  showArchive = () => {
    const { archiveUrl } = this.props.doc
    if (this.currentUrl === archiveUrl) return
    this.push(archiveUrl)
  }

  hideArchive = () => {
    const { archiveUrl } = this.props.doc
    if (this.currentUrl !== archiveUrl) return
    this.pop()
  }

  push = (url: string) => {
    if (this.peek() === url) return
    this.props.change(doc => {
      doc.navStack.push(url)
      return doc
    })
  }

  pop = () => {
    if (!this.peek()) return
    this.props.change(doc => {
      doc.navStack.pop()
      return doc
    })
  }

  peek = () => {
    const { navStack } = this.props.doc
    return navStack.length ? navStack[navStack.length - 1] : null
  }

  onThreeFingerSwipeDown = (event: TouchEvent) => {
    this.showArchive()
  }

  onThreeFingerSwipeUp = (event: TouchEvent) => {
    this.hideArchive()
  }

  onPinchEnd = (event: TouchEvent) => {
    // Prevent popping the last item off the navStack on pinch end.
    if (event.scale > 1 || this.props.doc.navStack.length < 2) return
    this.pop()
  }

  onCopy = (e: ClipboardEvent) => {
    // If an element other than body has focus (e.g. a text card input),
    // don't interfere with normal behavior.
    if (document.activeElement !== document.body) {
      return
    }

    // Otherwise, prevent default behavior and copy the currently active/fullscreen
    // document url to the clipboard. The archive cannot be shared, so do nothing
    // if the archive is currently fullscreen.
    e.preventDefault()
    const currentUrl = this.peek()
    if (currentUrl === null || currentUrl === this.props.doc.archiveUrl) return
    e.clipboardData.setData("text/plain", currentUrl)
    console.log(`Copied current url to the clipboard: ${currentUrl}`)
  }

  onPaste = (e: ClipboardEvent) => {
    // If an element other than body has focus (e.g. a text card input),
    // don't interfere with normal behavior.
    if (document.activeElement !== document.body) {
      return
    }

    // Otherwise, prevent default behavior, validate the contents of the clipboard
    // against the Link scheme, and (if a valid url) add to the archive.
    e.preventDefault()
    const pastedUrl = e.clipboardData.getData("text/plain")
    try {
      Link.parse(pastedUrl)
    } catch {
      console.log("Invalid document url")
      return
    }
    console.log("Adding document", pastedUrl)
    this.props.emit({ type: "DocumentCreated", body: pastedUrl })
  }

  render() {
    return (
      <Touch
        onThreeFingerSwipeDown={this.onThreeFingerSwipeDown}
        onThreeFingerSwipeUp={this.onThreeFingerSwipeUp}
        onPinchEnd={this.onPinchEnd}>
        <div class="Workspace" style={style.Workspace}>
          <Clipboard onCopy={this.onCopy} onPaste={this.onPaste} />
          <Content
            key={this.currentUrl}
            mode={this.props.mode}
            url={this.currentUrl}
            onNavigate={this.push}
          />
          <Content mode="embed" url={this.props.doc.shelfUrl} />
        </div>
      </Touch>
    )
  }
}

const style = {
  Workspace: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
}

export default Widget.create(
  "Workspace",
  Workspace,
  Workspace.reify,
  WorkspaceActor,
)