/**
 * Endereço da Graph API da Meta (Instagram e Facebook), num lugar só.
 *
 * A v18.0, usada até aqui, já saiu do ar; as métricas novas dos Reels (`views`) só existem
 * da v22.0 em diante (ADR 0021). GRAPH_API_VERSION no backend/.env troca a versão sem mexer no código.
 */
export const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v23.0'
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`
