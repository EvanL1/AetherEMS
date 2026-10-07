import { Request } from '@/utils/request'
import type { ApiResponse } from '@/types/user'
import type { InstancePointList } from '@/types/deviceConfiguration'

/*
获取设备实例点位
*/
export const getInstancePoints = (instanceId: number): Promise<ApiResponse<InstancePointList>> => {
  return Request.get(`/api/v1/automation/api/instances/${instanceId}/points`)
}

export const getAllInstances = () => {
  return Request.get('/api/v1/automation/api/instances/list')
}
