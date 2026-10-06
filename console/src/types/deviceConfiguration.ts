export interface InstancePointRouting {
  channel_id: number
  channel_point_id: number
  channel_type: 'T' | 'S' | 'C' | 'A'
  enabled: boolean
  channel_name: string
  channel_point_name: string
}
//点位信息
export interface InstancePointItem {
  point_index: number
  name: string
  unit: string
  description: string
  routing?: InstancePointRouting
}

export interface InstanceActionItem extends InstancePointItem {
  action_id: number
}
export interface InstanceMeasurementItem extends InstancePointItem {
  measurement_id: number
}
export interface InstancePropertyItem extends InstancePointItem {
  property_id: number
}
export interface InstancePointList {
  actions: {
    [key: string]: InstanceActionItem
  }
  measurements: {
    [key: string]: InstanceMeasurementItem
  }
  properties: {
    [key: string]: InstancePropertyItem
  }
}
