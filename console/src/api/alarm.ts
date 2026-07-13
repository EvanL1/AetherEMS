import {
  Request,
  confirmedMutationConfig,
  type MutationConfirmation,
} from '@/utils/request'
import type { CurrentAlarmResponse, HistoryAlarmResponse } from '@/types/alarm'
import type { RuleDetailResponse, RuleFormModel } from '@/types/ruleManagement'
import type { ApiResponse } from '@/types/user'

export const getRuleDetail = (id: string | number): Promise<ApiResponse<RuleDetailResponse>> => {
  return Request.get(`/api/v1/alarm/rules/${id}`)
}

export const createRule = (data: RuleFormModel, confirmation: MutationConfirmation) => {
  return Request.post('/api/v1/alarm/rules', data, confirmedMutationConfig(confirmation))
}

export const updateRule = (id: string, data: any, confirmation: MutationConfirmation) => {
  return Request.put(
    `/api/v1/alarm/rules/${id}`,
    data,
    confirmedMutationConfig(confirmation),
  )
}

export const deleteRule = (id: string, confirmation: MutationConfirmation) => {
  return Request.delete(
    `/api/v1/alarm/rules/${id}`,
    confirmedMutationConfig(confirmation),
  )
}
export const enableRule = (id: string | number, confirmation: MutationConfirmation) => {
  return Request.patch(
    `/api/v1/alarm/rules/${id}/enable`,
    undefined,
    confirmedMutationConfig(confirmation),
  )
}
export const disableRule = (id: string | number, confirmation: MutationConfirmation) => {
  return Request.patch(
    `/api/v1/alarm/rules/${id}/disable`,
    undefined,
    confirmedMutationConfig(confirmation),
  )
}
