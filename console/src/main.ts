import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import './router/guard' // 注册路由守卫
import {
  permissionDirective,
  fitColumnsDirective,
  throttleDirective,
  debounceDirective,
} from './utils/directives'
import { initResponsive } from './utils/responsive'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
const app = createApp(App)
const pinia = createPinia()

app.use(VueVirtualScroller as any)
// 配置Pinia持久化插件
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
// 注册自定义指令 v-permission
app.directive('permission', permissionDirective)
// 注册自定义指令 v-fit-columns（自动适配列宽）
app.directive('fit-columns', fitColumnsDirective)
// 注册自定义指令 v-throttle
app.directive('throttle', throttleDirective)
// 注册自定义指令 v-debounce
app.directive('debounce', debounceDirective)
// 初始化响应式配置
initResponsive()

// 启动应用
app.mount('#app')

// 应用启动后初始化WebSocket
