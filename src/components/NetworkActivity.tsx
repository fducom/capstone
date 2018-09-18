import * as Preact from "preact"
import * as Link from "../data/Link"
import Content, { Mode } from "./Content"
import Store, { Activity } from "../data/Store"
import * as css from "./css/NetworkActivity.css"

interface Props {
  store: Store
  mode: Mode
  url: string
}

export default class NetworkActivity extends Preact.Component<Props> {
  id = Link.parse(this.props.url).id
  upload: HTMLElement | null
  download: HTMLElement | null

  static reify() {
    return {}
  }

  componentDidMount() {
    this.props.store.activity(this.id).subscribe(this.onActivity)
  }

  render() {
    return (
      <div className={css.NetworkActivity}>
        <div className={css.Status} />
        <div className={css.Upload} ref={el => (this.upload = el)} />
        <div className={css.Download} ref={el => (this.download = el)} />
      </div>
    )
  }

  onActivity = (act: Activity) => {
    switch (act.type) {
      case "Download":
        this.download && this.download.classList.add(css.blink)
        requestAnimationFrame(() => {
          this.download && this.download.classList.remove(css.blink)
        })
      case "Upload":
        this.upload && this.upload.classList.add(css.blink)
        requestAnimationFrame(() => {
          this.upload && this.upload.classList.remove(css.blink)
        })
    }
  }
}

Content.registerWidget("NetworkActivity", NetworkActivity)
