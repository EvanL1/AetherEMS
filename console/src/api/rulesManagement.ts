import Request, {
  confirmedMutationConfig,
  type MutationConfirmation,
} from '@/utils/request'
import type { Rule, CreateRulePayload, UpdateRulePayload } from '@/types/ruleConfiguration'
import type { RuleChainPayload } from '@/types/ruleConfiguration'

export const listRules = async () => {
  return await Request.get<{ list: Rule[] }>('/api/v1/automation/api/rules')
}

export const getRuleDetail = async (id: string) => {
  return await Request.get<RuleChainPayload>(`/api/v1/automation/api/rules/${id}`)
}

export const createRule = async (
  payload: CreateRulePayload,
  confirmation: MutationConfirmation,
) => {
  return await Request.post<Rule>(
    '/api/v1/automation/api/rules',
    { ...payload, confirmed: true },
    confirmedMutationConfig(confirmation),
  )
}

export const updateRule = async (
  payload: RuleChainPayload | { name: string; description: string; id: string },
  confirmation: MutationConfirmation,
) => {
  return await Request.put<Rule>(
    `/api/v1/automation/api/rules/${payload.id}`,
    { ...payload, confirmed: true },
    confirmedMutationConfig(confirmation),
  )
}

export const deleteRule = async (id: string, confirmation: MutationConfirmation) => {
  return await Request.delete(
    `/api/v1/automation/api/rules/${id}`,
    confirmedMutationConfig(confirmation),
  )
}

export const enableRule = async (id: string, confirmation: MutationConfirmation) => {
  return await Request.post(
    `/api/v1/automation/api/rules/${id}/enable`,
    { confirmed: true },
    confirmedMutationConfig(confirmation),
  )
}

export const disableRule = async (id: string, confirmation: MutationConfirmation) => {
  return await Request.post(
    `/api/v1/automation/api/rules/${id}/disable`,
    { confirmed: true },
    confirmedMutationConfig(confirmation),
  )
}

export const submitRuleChain = async (
  payload: RuleChainPayload,
  confirmation: MutationConfirmation,
) => {
  return await Request.post(
    '/api/v1/automation/api/rules',
    { ...payload, confirmed: true },
    confirmedMutationConfig(confirmation),
  )
}
