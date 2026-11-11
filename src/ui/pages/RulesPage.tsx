import Markdown from 'react-markdown'
import rules from '../../../RULES.md?raw'

export function RulesPage() {
  return (
    <article className="rules">
      <Markdown>{rules}</Markdown>
    </article>
  )
}
