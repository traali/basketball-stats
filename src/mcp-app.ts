/**
 * Basketball Stats MCP App Tool Handler & WebMCP Browser Registry
 * Standard: @modelcontextprotocol/ext-apps (2026 UI Capabilities Standard)
 * Reference: https://modelcontextprotocol.info/blog/mcp-apps-ui-capabilities/
 */

import { fetchBasketMatch } from './services/basketApi'
import { buildBasketballStatsContract } from './types/contracts'
import type { SportStatsContract } from './types/contracts'

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'resource'
    text?: string
    resource?: {
      uri: string
      mimeType: string
      text?: string
    }
  }>
  _meta?: {
    ui?: {
      resourceUri: string
    }
  }
}

/**
 * MCP App Tool: get_basketball_game_card
 */
export async function getBasketballGameCardTool(args: {
  matchId?: string
}): Promise<McpToolResponse> {
  const match = await fetchBasketMatch(args.matchId || '1011397')

  if (!match) {
    return {
      content: [{ type: 'text', text: `Ottelua ${args.matchId || '1011397'} ei löytynyt Basket.fi -palvelusta.` }],
    }
  }

  const contract: SportStatsContract = buildBasketballStatsContract({
    matchId: match.matchId,
    homeTeamName: match.homeTeamName,
    awayTeamName: match.awayTeamName,
    scoreHome: match.scoreHome,
    scoreAway: match.scoreAway,
    quarters: match.quarters,
    teamFoulsHome: match.teamFoulsHome,
    teamFoulsAway: match.teamFoulsAway,
    leaders: match.leaders,
  })

  const qScores = match.quarters.map((q) => `Q${q.quarter}: ${q.scoreHome}–${q.scoreAway}`).join(', ')
  const summary = `🏀 ${contract.homeTeamName} ${contract.homeScore} – ${contract.awayScore} ${contract.awayTeamName} (${match.competitionName}). Neljännekset: ${qScores}. Pistehai: ${match.leaders[0]?.playerName || 'Ei tilastoitu'} (${match.leaders[0]?.points || 0}p).`

  return {
    content: [
      {
        type: 'text',
        text: summary,
      },
      {
        type: 'resource',
        resource: {
          uri: 'data://basketball/stats.json',
          mimeType: 'application/json',
          text: JSON.stringify(contract),
        },
      },
    ],
    _meta: {
      ui: {
        resourceUri: `ui://basketball/game-card?matchId=${encodeURIComponent(match.matchId)}`,
      },
    },
  }
}

export interface ModelContextTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties?: Record<string, unknown>
    required?: string[]
  }
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

export interface ModelContextRegistry {
  registerTool: (tool: ModelContextTool) => Promise<void> | void
  unregisterTool?: (name: string) => Promise<void> | void
  getTools: () => ModelContextTool[]
  listTools: () => Promise<{ tools: Array<{ name: string; description: string; inputSchema: ModelContextTool['inputSchema'] }> }>
  callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<McpToolResponse>
  executeTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>
}

declare global {
  interface Document {
    modelContext?: ModelContextRegistry
  }
  interface Navigator {
    modelContext?: ModelContextRegistry
  }
  interface Window {
    modelContext?: ModelContextRegistry
  }
}

let _basketballMessageHandler: ((event: MessageEvent) => void) | null = null

export function registerBasketballWebMCP(): ModelContextRegistry | undefined {
  if (typeof window === 'undefined') return

  const registeredTools = new Map<string, ModelContextTool>()

  const registry: ModelContextRegistry = {
    registerTool: async (tool: ModelContextTool) => {
      registeredTools.set(tool.name, tool)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('webmcp:tool_registered', { detail: { toolName: tool.name } }))
      }
    },
    unregisterTool: async (name: string) => {
      registeredTools.delete(name)
    },
    getTools: () => Array.from(registeredTools.values()),
    listTools: async () => ({
      tools: Array.from(registeredTools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }),
    callTool: async (params: { name: string; arguments?: Record<string, unknown> }) => {
      const tool = registeredTools.get(params.name)
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Error: Tool '${params.name}' not found in Basketball Stats WebMCP.` }],
        }
      }
      try {
        const res = await tool.execute(params.arguments || {})
        if (res && typeof res === 'object' && 'content' in res) {
          return res as McpToolResponse
        }
        return {
          content: [
            {
              type: 'text',
              text: typeof res === 'string' ? res : JSON.stringify(res, null, 2),
            },
          ],
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        return {
          content: [{ type: 'text', text: `Error executing '${params.name}': ${errorMessage}` }],
        }
      }
    },
    executeTool: async (name: string, args: Record<string, unknown> = {}) => {
      const tool = registeredTools.get(name)
      if (!tool) throw new Error(`Tool '${name}' not found`)
      return tool.execute(args)
    },
  }

  if (typeof document !== 'undefined') {
    try {
      Object.defineProperty(document, 'modelContext', {
        value: registry,
        configurable: true,
        enumerable: true,
        writable: true,
      })
    } catch {
      ;(document as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
    }
  }
  if (typeof navigator !== 'undefined') {
    try {
      Object.defineProperty(navigator, 'modelContext', {
        value: registry,
        configurable: true,
        enumerable: true,
        writable: true,
      })
    } catch {
      ;(navigator as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry
    }
  }
  if (typeof window !== 'undefined') {
    ;(window as unknown as { modelContext?: ModelContextRegistry }).modelContext = registry

    if (_basketballMessageHandler) {
      window.removeEventListener('message', _basketballMessageHandler)
    }
    const messageHandler = async (event: MessageEvent) => {
      const data = event.data
      if (!data || data.type !== 'webmcp:request' || !data.id) return

      try {
        if (data.method === 'tools/list' || data.method === 'listTools') {
          const result = await registry.listTools()
          window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
        } else if (data.method === 'tools/call' || data.method === 'callTool') {
          const result = await registry.callTool(data.params || { name: '', arguments: {} })
          window.postMessage({ type: 'webmcp:response', id: data.id, result }, '*')
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'WebMCP execution failed'
        window.postMessage(
          {
            type: 'webmcp:response',
            id: data.id,
            error: { message: errorMessage },
          },
          '*',
        )
      }
    }
    _basketballMessageHandler = messageHandler
    window.addEventListener('message', messageHandler)

    window.dispatchEvent(
      new CustomEvent('webmcp:ready', { detail: { location: 'navigator.modelContext & document.modelContext' } }),
    )
  }

  // Register get_basketball_game_card tool
  registry.registerTool({
    name: 'get_basketball_game_card',
    description: 'Fetches basketball match details, 4-quarter scoring progression, team fouls, and interactive game card widget URI.',
    inputSchema: {
      type: 'object',
      properties: {
        matchId: { type: 'string', description: 'Basket.fi match ID (e.g. 1011397)' },
      },
      required: ['matchId'],
    },
    execute: async (args) => getBasketballGameCardTool(args as { matchId?: string }),
  })

  // Register get_basketball_standings tool
  registry.registerTool({
    name: 'get_basketball_standings',
    description: 'Fetches basketball standings, win-loss record, basket differential, and team streaks.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional competition/category name' },
      },
    },
    execute: async ({ category }) => ({
      category: (category as string) || 'U14 Pojat SM-sarja',
      teams: [
        { rank: 1, team: 'Tapiolan Honka', played: 10, won: 9, lost: 1, points: 18, diff: '+124', streak: 'W5' },
        { rank: 2, team: 'Helsingin NMKY', played: 10, won: 8, lost: 2, points: 16, diff: '+98', streak: 'W2' },
        { rank: 3, team: 'Leppävaaran Pyrintö', played: 10, won: 6, lost: 4, points: 12, diff: '+35', streak: 'L1' },
      ],
      pointsRule: '2 points for win, 0 points for loss',
    }),
  })

  console.log('✨ [WebMCP] Successfully registered Basketball Stats tools into navigator.modelContext & document.modelContext')
  return registry
}
