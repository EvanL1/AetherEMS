import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTableData, type TableConfig } from '../useTableData'

vi.mock('@/utils/request', () => ({
  Request: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

describe('useTableData', () => {
  const mockConfig = {
    listUrl: '/test/list',
    defaultPageSize: 20,
    deleteUrl: '/test/delete/{id}',
  }

  const mountComposable = (
    onSetup?: (api: ReturnType<typeof useTableData>) => void,
    config: TableConfig = mockConfig,
  ) => {
    const Host = defineComponent({
      setup() {
        const api = useTableData(config)
        onSetup?.(api)
        return () => h('div')
      },
    })

    return mount(Host)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', async () => {
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue({
      success: true,
      data: { list: [], total: 0 },
    })

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    await Promise.resolve()

    expect(api.loading.value).toBe(false)
    expect(api.tableData.value).toEqual([])
    expect(api.pagination.page).toBe(1)
    expect(api.pagination.pageSize).toBe(20)
    expect(api.pagination.total).toBe(0)

    wrapper.unmount()
  })

  it('should fetch table data successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        list: [{ id: 1, name: 'test' }],
        total: 1,
      },
    }

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    await api.fetchTableData()

    expect(api.tableData.value).toEqual([{ id: 1, name: 'test' }])
    expect(api.pagination.total).toBe(1)
    expect(Request.get).toHaveBeenCalledWith('/test/list', expect.any(Object))

    wrapper.unmount()
  })

  it('should include filters in query params when fetching data', async () => {
    const mockResponse = {
      success: true,
      data: { list: [], total: 0 },
    }

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    api.filters.status = 'active'
    await api.fetchTableData(true)

    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({
        status: 'active',
        page: 1,
      }),
    )

    wrapper.unmount()
  })

  it('should handle pagination changes', async () => {
    const mockResponse = {
      success: true,
      data: { list: [], total: 0 },
    }

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })

    await api.handlePageChange(2)
    expect(Request.get).toHaveBeenCalledWith('/test/list', expect.objectContaining({ page: 2 }))

    await api.handlePageSizeChange(50)
    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({ page: 1, page_size: 50 }),
    )

    wrapper.unmount()
  })

  it('should handle delete row', async () => {
    const mockResponse = { success: true }
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.delete).mockResolvedValue(mockResponse)
    const { ElMessageBox } = await import('element-plus')
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    const result = await api.deleteRow('1')
    await Promise.resolve()
    await Promise.resolve()

    expect(result).toBe(false)
    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(Request.delete).toHaveBeenCalledWith('/test/delete/1')

    wrapper.unmount()
  })

  it('should clear filters and keyword when reloading filters', async () => {
    const mockResponse = {
      success: true,
      data: { list: [], total: 0 },
    }

    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue(mockResponse)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    api.filters.status = 'active'

    api.reloadFilters()

    expect(Request.get).toHaveBeenCalledWith(
      '/test/list',
      expect.objectContaining({
        page: 1,
      }),
    )
    expect(api.filters.status).toBeNull()
    expect(api.queryParams.keyword).toBe('')

    wrapper.unmount()
  })

  it('clears stale data and loading state when fetching fails', async () => {
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockRejectedValue(new Error('list unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })
    api.tableData.value = [{ id: 9 }]
    api.pagination.total = 1

    await expect(api.fetchTableData()).resolves.toBe(false)

    expect(api.tableData.value).toEqual([])
    expect(api.pagination.total).toBe(0)
    expect(api.loading.value).toBe(false)
    wrapper.unmount()
  })

  it('applies and clears sorting, then resets pagination and filters', async () => {
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue({ success: true, data: { list: [], total: 0 } })

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable((exposed) => {
      api = exposed
    })

    api.handleSortChange({ prop: 'name', order: 'ascending' })
    expect(api.queryParams.sortBy).toBe('name')
    expect(api.queryParams.sortOrder).toBe('asc')

    api.handleSortChange({ prop: 'name', order: 'descending' })
    expect(api.queryParams.sortOrder).toBe('desc')

    api.handleSortChange({ prop: '', order: null })
    expect(api.queryParams.sortBy).toBeUndefined()
    expect(api.queryParams.sortOrder).toBeUndefined()

    api.pagination.page = 4
    api.pagination.pageSize = 100
    api.filters.status = 'active'
    api.resetTable()

    expect(api.pagination.page).toBe(1)
    expect(api.pagination.pageSize).toBe(20)
    expect(api.filters.status).toBeNull()
    expect(api.getCurrentParams()).toMatchObject({
      pagination: { page: 1, pageSize: 20 },
      filters: { status: null },
    })
    wrapper.unmount()
  })

  it('warns when delete, batch delete, and export capabilities are unavailable', async () => {
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue({ success: true, data: { list: [], total: 0 } })
    const { ElMessage, ElMessageBox } = await import('element-plus')

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable(
      (exposed) => {
        api = exposed
      },
      { listUrl: '/test/list' },
    )

    await expect(api.deleteRow(1)).resolves.toBe(false)
    await expect(api.batchDeleteRows([])).resolves.toBe(false)
    await expect(api.exportData()).resolves.toBe(false)

    expect(ElMessage.warning).toHaveBeenCalledWith('Delete function is not enabled')
    expect(ElMessage.warning).toHaveBeenCalledWith('Batch delete function is not enabled')
    expect(ElMessage.warning).toHaveBeenCalledWith('导出功能未启用')
    expect(ElMessageBox.confirm).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('batch deletes selected rows and exports the active filtered query', async () => {
    const { Request } = await import('@/utils/request')
    vi.mocked(Request.get).mockResolvedValue({ success: true, data: { list: [], total: 0 } })
    vi.mocked(Request.post).mockResolvedValue({ success: true } as any)
    vi.mocked(Request.download).mockResolvedValue(undefined as any)
    const { ElMessageBox, ElMessage } = await import('element-plus')
    vi.mocked(ElMessageBox.confirm).mockResolvedValue('confirm' as any)

    let api!: ReturnType<typeof useTableData>
    const wrapper = mountComposable(
      (exposed) => {
        api = exposed
      },
      {
        listUrl: '/test/list',
        batchDeleteUrl: '/test/batch-delete',
        enableExport: true,
        exportUrl: '/test/export',
      },
    )
    api.filters.status = 'active'
    await api.fetchTableData()

    await api.batchDeleteRows([1, '2'])
    expect(Request.post).toHaveBeenCalledWith('/test/batch-delete', { ids: [1, '2'] })
    expect(ElMessage.success).toHaveBeenCalledWith('成功删除 2 条记录')

    await expect(api.exportData('records.xlsx', { format: 'xlsx' })).resolves.toBe(true)
    expect(Request.download).toHaveBeenCalledWith(
      '/test/export',
      expect.objectContaining({ status: 'active', format: 'xlsx' }),
      'records.xlsx',
    )

    vi.mocked(Request.download).mockRejectedValueOnce(new Error('export unavailable'))
    await expect(api.exportData('records.xlsx')).resolves.toBe(false)
    expect(api.loading.value).toBe(false)
    wrapper.unmount()
  })
})
