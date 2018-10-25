import * as React from "react"
import * as Env from "../data/Env"

type Props = {}

type State = {
  env: string
  msg: string
}

export default class EnvMgr extends React.Component<Props, State> {
  state: State = { env: Env.raw(), msg: "" }

  save(str: string) {
    const env = JSON.parse(str)
    Env.store(env)

    this.setState({ env: str, msg: "Change requires app restart" })
  }

  onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    event.preventDefault()

    const str = event.target.value
    if (str.indexOf("\n") >= 0) {
      this.save(this.state.env)
    } else {
      this.setState({
        env: str,
        msg: "press enter to save",
      })
    }
  }

  render() {
    const { env, msg } = this.state
    return (
      <div>
        <div>Enter a new Env:</div>
        <textarea rows={1} cols={85} onChange={this.onChange} value={env} />
        <div>
          <b>{msg}</b>
        </div>
      </div>
    )
  }
}