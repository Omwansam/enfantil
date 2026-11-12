/** Help articles. */
import { get } from './client'

export function getHelpArticles() {
  return get('/help/articles')
}
