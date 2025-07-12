<template>
  <div id="app">
    <header class="app-header">
      <h1>Bocil Call</h1>
      <p>Simple video chat for kids</p>
      <div class="environment-info">
        <span class="env-badge" :class="environmentClass">
          {{ environmentName }}
        </span>
        <span class="signaling-info">
          Signaling: {{ signalingMethod }}
        </span>
      </div>
    </header>
    
    <main class="app-main">
      <component :is="currentComponent" />
    </main>
    
    <footer class="app-footer">
      <p>Made with ❤️ for kids</p>
    </footer>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import ENV from './config/environment.js'

export default {
  name: 'App',
  setup() {
    const currentComponent = ref(null)
    const environmentName = ref('')
    const signalingMethod = ref('')

    // Computed properties
    const environmentClass = computed(() => {
      return ENV.isDevelopment() ? 'dev' : 'prod'
    })

    // Initialize the appropriate component
    const initializeComponent = async () => {
      try {
        if (ENV.isDevelopment()) {
          console.log('🔧 Development environment detected')
          const { default: VideoChatLocal } = await import('./components/VideoChatLocal.vue')
          currentComponent.value = VideoChatLocal
          environmentName.value = 'Development'
          signalingMethod.value = 'WebSocket'
        } else {
          console.log('🚀 Production environment detected')
          const { default: VideoChatProduction } = await import('./components/VideoChatProduction.vue')
          currentComponent.value = VideoChatProduction
          environmentName.value = 'Production'
          signalingMethod.value = 'HTTP Polling'
        }
      } catch (error) {
        console.error('❌ Error loading component:', error)
        // Fallback to production component
        const { default: VideoChatProduction } = await import('./components/VideoChatProduction.vue')
        currentComponent.value = VideoChatProduction
        environmentName.value = 'Production (Fallback)'
        signalingMethod.value = 'HTTP Polling'
      }
    }

    onMounted(() => {
      initializeComponent()
    })

    return {
      currentComponent,
      environmentName,
      signalingMethod,
      environmentClass
    }
  }
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-header {
  text-align: center;
  padding: 2rem;
  color: white;
}

.app-header h1 {
  font-size: 3rem;
  margin: 0;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.app-header p {
  font-size: 1.2rem;
  margin: 0.5rem 0 0 0;
  opacity: 0.9;
}

.environment-info {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.env-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.env-badge.dev {
  background: #4caf50;
  color: white;
}

.env-badge.prod {
  background: #ff9800;
  color: white;
}

.signaling-info {
  font-size: 0.9rem;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
}

.app-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.app-footer {
  text-align: center;
  padding: 1rem;
  color: white;
  opacity: 0.8;
}
</style> 