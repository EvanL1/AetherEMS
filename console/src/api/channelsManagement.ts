import { Request } from '@/utils/request'
import type { PointType } from '@/types/channelConfiguration'

export const getPointsTables = (id: number, type?: PointType, config?: any) => {
  return Request.get(`/api/v1/io/api/channels/${id}/points`, type ? { type } : null, config)
}

/** 获取通道列表（用于下拉选项） */
export const getAllChannels = () => {
  return Request.get('/api/v1/io/api/channels/list')
}
