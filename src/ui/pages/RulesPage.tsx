import Markdown from 'react-markdown'
import en from '../../../RULES.md?raw'
import sv from '../../../RULES.sv.md?raw'
import { useLanguage } from '../../i18n'

const rules = { en, sv }

export function RulesPage() {
  const language = useLanguage((s) => s.language)
  return (
    <article className="rules">
      <Markdown>{rules[language]}</Markdown>
    </article>
  )
}
