export type PointType = 'T' | 'S' | 'C' | 'A'
// 点位信息
export interface PointInfo {
  point_id: number
  signal_name: string
  scale: number
  offset: number
  unit: string
  data_type: string
  reverse: boolean
  description: string
  // 实时值（通过WebSocket更新）
  value?: number
  rowStatus?: 'normal' | 'modified' | 'added' | 'deleted'
  modifiedFields?: string[] // 记录哪些字段被修改了
  isEditing?: boolean // 标记该行是否处于编辑状态
  isNewUnconfirmed?: boolean // 标记是否为未确认的新增行
  originalData?: Record<string, any> // 备份原始数据用于取消编辑，可以存储 PointInfo 字段或 mapping 字段
  protocol_mapping?: {
    bit_position?: number
    byte_order?: string
    data_type?: string
    function_code?: number
    register_address?: number
    slave_id?: number
  }
  config?: {
    realTimeValue?: any
  }
  has_mapping?: boolean
}
export interface PointInfoResponse {
  telemetry: PointInfo[]
  signal: PointInfo[]
  control: PointInfo[]
  adjustment: PointInfo[]
}
