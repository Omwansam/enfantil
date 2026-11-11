import { request } from './client'
import { helpArticles, helpTopics } from '../data/mockData'

export function getHelpArticles() {
  return request(() => ({ topics: helpTopics, articles: helpArticles }), { delay: 200 })
}
