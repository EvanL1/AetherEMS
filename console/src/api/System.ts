import {
  Request,
  confirmedMutationConfig,
  type MutationConfirmation,
} from '@/utils/request'

export const getMqttConfig = () => {
  return Request.get('/api/v1/uplink/mqtt/config')
}

export const updateMqttConfig = (params: any, confirmation: MutationConfirmation) => {
  return Request.post(
    '/api/v1/uplink/mqtt/config',
    params,
    confirmedMutationConfig(confirmation),
  )
}

export const disconnectMqtt = (confirmation: MutationConfirmation) => {
  return Request.post(
    '/api/v1/uplink/mqtt/disconnect',
    undefined,
    confirmedMutationConfig(confirmation),
  )
}

export const reconnectMqtt = (confirmation: MutationConfirmation) => {
  return Request.post(
    '/api/v1/uplink/mqtt/reconnect',
    undefined,
    confirmedMutationConfig(confirmation),
  )
}
export const getMqttStatus = () => {
  return Request.get('/api/v1/uplink/mqtt/status')
}

export type CertificateType = 'ca_cert' | 'client_cert' | 'client_key'

export const getCertificateInfo = () => {
  return Request.get('/api/v1/uplink/certificate/info')
}

export const uploadCertificate = (
  certType: CertificateType,
  file: File,
  confirmation: MutationConfirmation,
) => {
  return Request.upload(
    '/api/v1/uplink/certificate/upload',
    file,
    { cert_type: certType },
    confirmedMutationConfig(confirmation),
  )
}

export const deleteCertificate = (certType: CertificateType, confirmation: MutationConfirmation) => {
  return Request.delete(
    `/api/v1/uplink/certificate/${certType}`,
    confirmedMutationConfig(confirmation),
  )
}
