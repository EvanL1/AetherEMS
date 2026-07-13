import {
  Request,
  confirmedMutationConfig,
  type MutationConfirmation,
} from '@/utils/request'
import type {
  ChannelDetail,
  PointType,
  updateChannelDetail,
  BatchUpdateMappingPointRequest,
  PublishPointsRequest,
  BatchPointsChangeRequest,
} from '@/types/channelConfiguration'

/**
 * 修改通道启用状态
 * @param id 通道ID
 * @param enabled 启用状态
 * @returns
 */
export const ChangeChannelEnabled = (
  id: number,
  enabled: boolean,
  confirmation: MutationConfirmation,
) => {
  return Request.put(
    `/api/v1/io/api/channels/${id}/enabled`,
    { enabled },
    confirmedMutationConfig(confirmation),
  )
}
/**
 * 获取通道详情
 * @param id 通道ID
 * @returns
 */
export const getChannelDetail = (id: number) => {
  return Request.get(`/api/v1/io/api/channels/${id}`, null, { timeout: 60000 })
}
/**
 * 修改通道详情
 * @param id 通道ID
 * @param data 通道详情
 * @returns
 */
export const updateChannel = (
  id: number,
  data: updateChannelDetail,
  confirmation: MutationConfirmation,
) => {
  return Request.put(
    `/api/v1/io/api/channels/${id}`,
    data,
    confirmedMutationConfig(confirmation),
  )
}
/**
 * 创建通道
 * @param data 通道详情
 * @returns
 */
export const createChannel = (data: ChannelDetail, confirmation: MutationConfirmation) => {
  return Request.post(
    '/api/v1/io/api/channels',
    data,
    confirmedMutationConfig(confirmation),
  )
}
/**
 * 控制通道状态
 * @param id 通道ID
 * @param data 通道状态 'start' | 'stop' | 'restart'
 * @returns
 */
export const controlChannelStatus = (
  id: number,
  data: 'start' | 'stop' | 'restart',
  confirmation: MutationConfirmation,
) => {
  return Request.post(
    `/api/v1/io/api/channels/${id}/control`,
    { operation: data },
    confirmedMutationConfig(confirmation),
  )
}

export const getPointsTables = (id: number, type?: PointType, config?: any) => {
  return Request.get(`/api/v1/io/api/channels/${id}/points`, type ? { type } : null, config)
}

/** 获取未映射的点位列表（用于新增映射） */
export const getUnmappedPoints = (id: number, type: PointType) => {
  return Request.get(`/api/v1/io/api/channels/${id}/unmapped-points`, { type })
}

export const getMappingPoints = (id: number, type: PointType, pointId: number) => {
  return Request.get(`/api/v1/io/api/channels/${id}/${type}/points/${pointId}/mapping`)
}

/**
 * 获取通道映射表
 * @param id 通道ID
 */
export const getChannelMappings = (id: number) => {
  return Request.get(`/api/v1/io/api/channels/${id}/mappings`, null)
}

// /** 发布控制值 */
// export const postControlValue = (
//   channelId: number,
//   pointId: number,
//   value: boolean | number | string,
// ) => {
//   return Request.post(`/api/v1/io/api/channels/${channelId}/points/${pointId}/control`, { value })
// }

// /** 发布调节值 */
// export const postAdjustmentValue = (
//   channelId: number,
//   pointId: number,
//   value: boolean | number | string,
// ) => {
//   return Request.post(`/api/v1/io/api/channels/${channelId}/points/${pointId}/adjustment`, { value })
// }
export const publishPointValue = (
  channelId: number,
  data: PublishPointsRequest,
  confirmation: MutationConfirmation,
) => {
  return Request.post(
    `/api/v1/io/api/channels/${channelId}/write`,
    data,
    confirmedMutationConfig(confirmation),
  )
}
/** 批量发布控制值 */
export const postControlBatch = (
  channelId: number,
  commands: Array<{ point_id: number; value: number }>,
  confirmation: MutationConfirmation,
) => {
  return Request.post(
    `/api/v1/io/api/channels/${channelId}/control/batch`,
    { commands },
    confirmedMutationConfig(confirmation),
  )
}

/** 批量发布调节值 */
export const postAdjustmentBatch = (
  channelId: number,
  commands: Array<{ point_id: number; value: number }>,
  confirmation: MutationConfirmation,
) => {
  return Request.post(
    `/api/v1/io/api/channels/${channelId}/adjustment/batch`,
    { commands },
    confirmedMutationConfig(confirmation),
  )
}

/** 更新点位映射 */
export const batchUpdateMappingPoint = (
  id: number,
  data: BatchUpdateMappingPointRequest,
  confirmation: MutationConfirmation,
) => {
  return Request.put(
    `/api/v1/io/api/channels/${id}/mappings`,
    data,
    confirmedMutationConfig(confirmation),
  )
}

/** 批量增删改点位（基础信息） */
export const postPointsBatch = (
  channelId: number,
  data: BatchPointsChangeRequest,
  confirmation: MutationConfirmation,
) => {
  return Request.post(
    `/api/v1/io/api/channels/${channelId}/points/batch`,
    data,
    confirmedMutationConfig(confirmation),
  )
}

/** 获取通道列表（用于下拉选项） */
export const getAllChannels = () => {
  return Request.get('/api/v1/io/api/channels/list')
}

/** 批量获取通道信息（用于导入后回显） */
export const getChannelsByIds = (ids: number[], config?: any) => {
  if (!ids || ids.length === 0) {
    return Promise.resolve({ success: true, data: { list: [] } })
  }
  const idsParam = ids.join(',')
  return Request.get(`/api/v1/io/api/channels/search`, { ids: idsParam }, config)
}
