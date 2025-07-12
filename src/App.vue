<template>
  <div id="app">
    <header class="app-header">
      <h1>Bocil Call</h1>
      <p>Simple video chat for kids</p>
    </header>
    
    <main class="app-main">
      <VideoChat />
    </main>
    
    <footer class="app-footer">
      <p>Made with ❤️ for kids</p>
    </footer>
  </div>
</template>

<script>
import VideoChat from './components/VideoChat.vue'

export default {
  name: 'App',
  components: {
    VideoChat
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